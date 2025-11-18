"""
PDF generation utilities for invoices.
"""

try:
    import io
    import os
    import base64
    from datetime import datetime
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    import logging
    
    REPORTLAB_AVAILABLE = True
except ImportError as e:
    REPORTLAB_AVAILABLE = False
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"reportlab is not available: {e}. PDF generation will not work. Install with: pip install reportlab")

if REPORTLAB_AVAILABLE:
    logger = logging.getLogger(__name__)


def generate_invoice_pdf(invoice, invoice_items, container, shipping_mark, owner):
    """
    Generate a PDF invoice for shipping fees.
    
    Args:
        invoice: Invoice model instance
        invoice_items: List of InvoiceItem instances
        container: Container model instance
        shipping_mark: ShippingMark instance
        owner: UserModel instance (invoice owner)
    
    Returns:
        bytes: PDF file content as bytes
    
    Raises:
        ImportError: If reportlab is not installed
    """
    if not REPORTLAB_AVAILABLE:
        raise ImportError("reportlab is not installed. Please install it with: pip install reportlab")
    
    buffer = io.BytesIO()
    
    try:
        # Create PDF document
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        story = []
        
        # Get styles
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2563eb'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=12
        )
        
        # Add logo if available
        logo_path = os.path.join(os.path.dirname(__file__), "static", "fofoofo.png")
        if os.path.exists(logo_path):
            try:
                logo = Image(logo_path, width=2*inch, height=0.8*inch)
                logo.hAlign = 'CENTER'
                story.append(logo)
                story.append(Spacer(1, 0.2*inch))
            except Exception as e:
                logger.warning(f"Could not add logo to PDF: {e}")
        
        # Title
        story.append(Paragraph("INVOICE", title_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Invoice header information
        header_data = [
            ['Invoice Number:', invoice.invoice_number or 'N/A'],
            ['Issue Date:', invoice.issue_date.strftime('%B %d, %Y') if invoice.issue_date else 'N/A'],
            ['Due Date:', invoice.due_date.strftime('%B %d, %Y') if invoice.due_date else 'N/A'],
            ['Container:', container.container_number if container else 'N/A'],
            ['Shipping Mark:', shipping_mark.mark_id if shipping_mark else 'N/A'],
        ]
        
        header_table = Table(header_data, colWidths=[2*inch, 4*inch])
        header_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#4b5563')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1f2937')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Bill To section
        story.append(Paragraph("Bill To:", heading_style))
        bill_to_data = [
            ['Name:', owner.full_name if owner else 'N/A'],
            ['Email:', owner.email if owner else 'N/A'],
        ]
        if owner and owner.contact:
            bill_to_data.append(['Contact:', owner.contact])
        
        bill_to_table = Table(bill_to_data, colWidths=[1.5*inch, 4.5*inch])
        bill_to_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1f2937')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(bill_to_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Items table
        story.append(Paragraph("Invoice Items", heading_style))
        
        # Table headers
        table_data = [['Tracking #', 'Status', 'CBM', 'Fee (USD)']]
        
        # Add items
        for item in invoice_items:
            tracking_status = 'N/A'
            if item.tracking:
                tracking_status = item.tracking.status if hasattr(item.tracking, 'status') else 'N/A'
            table_data.append([
                item.tracking_number or 'N/A',
                tracking_status,
                f"{float(item.cbm or 0):.3f}",
                f"${float(item.total_amount or 0):.2f}"
            ])
        
        # Create table
        items_table = Table(table_data, colWidths=[2*inch, 1.5*inch, 1*inch, 1.5*inch])
        items_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#4b5563')),
            ('ALIGN', (2, 1), (3, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor('#d1d5db')),
            
            # Padding
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        story.append(items_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Totals section
        story.append(Spacer(1, 0.2*inch))
        totals_data = [
            ['Subtotal (USD):', f"${float(invoice.subtotal or 0):.2f}"],
        ]
        
        if invoice.tax_amount and float(invoice.tax_amount) > 0:
            totals_data.append(['Tax (USD):', f"${float(invoice.tax_amount):.2f}"])
        
        if invoice.discount_amount and float(invoice.discount_amount) > 0:
            totals_data.append(['Discount (USD):', f"-${float(invoice.discount_amount):.2f}"])
        
        totals_data.append(['Total (USD):', f"${float(invoice.total_amount or 0):.2f}"])
        
        if invoice.exchange_rate and invoice.total_amount_ghs:
            totals_data.append(['', ''])  # Empty row
            totals_data.append(['Exchange Rate:', f"1 USD = {float(invoice.exchange_rate):.4f} GHS"])
            totals_data.append(['Total (GHS):', f"GH₵{float(invoice.total_amount_ghs):.2f}"])
        
        totals_table = Table(totals_data, colWidths=[4*inch, 2*inch])
        totals_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -2), 'Helvetica'),
            ('FONTNAME', (0, -1), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1f2937')),
            ('FONTSIZE', (0, -1), (1, -1), 12),
            ('FONTNAME', (0, -1), (1, -1), 'Helvetica-Bold'),
            ('LINEABOVE', (0, -1), (1, -1), 1, colors.HexColor('#d1d5db')),
            ('TOPPADDING', (0, -1), (1, -1), 8),
            ('BOTTOMPADDING', (0, -1), (1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(totals_table)
        story.append(Spacer(1, 0.4*inch))
        
        # Payment information
        payment_style = ParagraphStyle(
            'PaymentInfo',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#4b5563'),
            spaceAfter=6
        )
        
        story.append(Paragraph("Payment Information", heading_style))
        story.append(Paragraph("For Payment Details contact <b>0540266839</b>.", payment_style))
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph("Thank you for shipping with us.", payment_style))
        
        # Build PDF
        doc.build(story)
        
        # Get PDF content
        buffer.seek(0)
        pdf_content = buffer.read()
        buffer.close()
        
        return pdf_content
        
    except Exception as e:
        logger.error(f"Error generating PDF invoice: {str(e)}")
        buffer.close()
        raise

