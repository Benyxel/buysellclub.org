"""
Management command to populate initial categories and product types
that are currently hardcoded in the frontend shop.
"""
from django.core.management.base import BaseCommand
from buysellapi.models import Category, ProductType


class Command(BaseCommand):
    help = 'Populate initial categories and product types from frontend shop'

    def handle(self, *args, **options):
        # Categories from Shop.jsx
        categories = [
            {'name': 'Gadget', 'order': 10},
            {'name': 'Kitchen', 'order': 20},
            {'name': 'Wear', 'order': 30},
        ]
        
        # Product Types from Shop.jsx
        product_types = [
            {'name': 'Mouse', 'order': 10},
            {'name': 'Droin', 'order': 20},
            {'name': 'Phone', 'order': 30},
            {'name': 'Footwear', 'order': 40},
        ]
        
        # Create categories
        created_categories = 0
        updated_categories = 0
        for cat_data in categories:
            category, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults={
                    'order': cat_data['order'],
                    'is_active': True,
                    'description': f'{cat_data["name"]} category'
                }
            )
            if not created:
                # Update order if category already exists
                category.order = cat_data['order']
                category.is_active = True
                category.save()
                updated_categories += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated category: {cat_data["name"]}')
                )
            else:
                created_categories += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created category: {cat_data["name"]}')
                )
        
        # Create product types
        created_types = 0
        updated_types = 0
        for type_data in product_types:
            product_type, created = ProductType.objects.get_or_create(
                name=type_data['name'],
                defaults={
                    'order': type_data['order'],
                    'is_active': True,
                    'description': f'{type_data["name"]} product type'
                }
            )
            if not created:
                # Update order if type already exists
                product_type.order = type_data['order']
                product_type.is_active = True
                product_type.save()
                updated_types += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated product type: {type_data["name"]}')
                )
            else:
                created_types += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created product type: {type_data["name"]}')
                )
        
        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSummary:\n'
                f'Categories: {created_categories} created, {updated_categories} updated\n'
                f'Product Types: {created_types} created, {updated_types} updated'
            )
        )

