import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaGavel, 
  FaShieldAlt,
  FaFileContract,
  FaHandshake,
  FaBan,
  FaBalanceScale,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt
} from 'react-icons/fa';

const TermsAndConditions = () => {
  const [activeSection, setActiveSection] = useState(null);

  const toggleSection = (section) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const sections = [
    {
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      icon: <FaCheckCircle className="text-green-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            By accessing and using BuySellClub's platform, services, website, mobile applications, 
            and any related services (collectively, the "Service"), you acknowledge that you have 
            read, understood, and agree to be bound by these Terms and Conditions ("Terms"). 
            These Terms constitute a legally binding agreement between you ("User", "you", or "your") 
            and BuySellClub ("Company", "we", "us", or "our").
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Important:</strong> If you do not agree to these Terms, you must immediately 
              discontinue use of the Service. Your continued use of the Service after any changes 
              to these Terms constitutes acceptance of those changes.
            </p>
          </div>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            These Terms apply to all users of the Service, including without limitation users who 
            are browsers, vendors, customers, merchants, and/or contributors of content. By using 
            our Service, you represent that you are at least 18 years of age or have obtained 
            parental consent to use the Service.
          </p>
        </div>
      )
    },
    {
      id: 'definitions',
      title: '2. Definitions',
      icon: <FaFileContract className="text-blue-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            For the purposes of these Terms, the following definitions apply:
          </p>
          <dl className="space-y-3">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
              <dt className="font-semibold text-gray-900 dark:text-white mb-1">"Service"</dt>
              <dd className="text-gray-700 dark:text-gray-300 text-sm">
                Refers to all services provided by BuySellClub, including but not limited to 
                e-commerce platform, shipping and logistics, Buy4Me procurement, payment processing, 
                training services, and any related applications or tools.
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
              <dt className="font-semibold text-gray-900 dark:text-white mb-1">"User Account"</dt>
              <dd className="text-gray-700 dark:text-gray-300 text-sm">
                The account created by you to access and use the Service, including all associated 
                credentials, personal information, and transaction history.
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
              <dt className="font-semibold text-gray-900 dark:text-white mb-1">"Content"</dt>
              <dd className="text-gray-700 dark:text-gray-300 text-sm">
                Any information, data, text, graphics, images, videos, audio files, software, 
                or other materials posted, uploaded, or transmitted through the Service.
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
              <dt className="font-semibold text-gray-900 dark:text-white mb-1">"Intellectual Property"</dt>
              <dd className="text-gray-700 dark:text-gray-300 text-sm">
                All trademarks, service marks, logos, trade names, copyrights, patents, trade 
                secrets, and other intellectual property rights owned or licensed by BuySellClub.
              </dd>
            </div>
          </dl>
        </div>
      )
    },
    {
      id: 'account',
      title: '3. User Account Registration and Security',
      icon: <FaShieldAlt className="text-purple-500" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">3.1 Account Creation</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            To access certain features of the Service, you must create a User Account. You agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and promptly update your account information to keep it accurate, current, and complete</li>
            <li>Maintain the security of your password and identification</li>
            <li>Accept all responsibility for activities that occur under your account</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
            <li>Ensure that you are authorized to use the payment method(s) associated with your account</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">3.2 Account Security</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            You are solely responsible for maintaining the confidentiality of your account credentials. 
            You agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>Use a strong, unique password that you do not use for other online accounts</li>
            <li>Enable two-factor authentication when available</li>
            <li>Not share your account credentials with any third party</li>
            <li>Log out from your account at the end of each session, especially when using shared devices</li>
          </ul>

          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded mt-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Warning:</strong> BuySellClub will not be liable for any loss or damage 
              arising from your failure to comply with these security obligations. You may be held 
              liable for losses incurred by BuySellClub or any other user due to unauthorized 
              use of your account.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'services',
      title: '4. Services and Platform Usage',
      icon: <FaHandshake className="text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">4.1 Service Description</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            BuySellClub provides a comprehensive platform for:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>E-Commerce Services:</strong> Online marketplace for purchasing products from China and international suppliers</li>
            <li><strong>Shipping & Logistics:</strong> Freight forwarding, warehousing, and delivery services from China to Ghana</li>
            <li><strong>Buy4Me Services:</strong> Custom procurement and sourcing services for specific product requests</li>
            <li><strong>Payment Processing:</strong> Secure payment processing including Alipay integration and cross-border transactions</li>
            <li><strong>Training & Education:</strong> Educational courses and training materials related to import/export business</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">4.2 Service Availability</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            We strive to provide continuous access to our Service, but we do not guarantee 
            uninterrupted, secure, or error-free operation. The Service may be temporarily 
            unavailable due to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>Maintenance, updates, or technical issues</li>
            <li>Force majeure events beyond our control</li>
            <li>Third-party service provider outages</li>
            <li>Regulatory or legal requirements</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">4.3 Service Modifications</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            We reserve the right to modify, suspend, or discontinue any aspect of the Service 
            at any time, with or without notice. We may also impose limits on certain features 
            or restrict access to parts of the Service without notice or liability.
          </p>
        </div>
      )
    },
    {
      id: 'prohibited',
      title: '5. Prohibited Activities and User Conduct',
      icon: <FaBan className="text-red-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            You agree NOT to use the Service to:
          </p>
          
          <div className="space-y-3">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded border-l-4 border-red-400">
              <h5 className="font-semibold text-gray-900 dark:text-white mb-2">5.1 Illegal Activities</h5>
              <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Violate any applicable local, national, or international law or regulation</li>
                <li>Engage in money laundering, fraud, or other financial crimes</li>
                <li>Import or export prohibited items (weapons, drugs, counterfeit goods, etc.)</li>
                <li>Violate trade sanctions or embargoes</li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded border-l-4 border-orange-400">
              <h5 className="font-semibold text-gray-900 dark:text-white mb-2">5.2 Security Violations</h5>
              <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Introduce viruses, malware, or other harmful code</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Reverse engineer, decompile, or disassemble any software</li>
                <li>Use automated systems (bots, scrapers) without authorization</li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded border-l-4 border-yellow-400">
              <h5 className="font-semibold text-gray-900 dark:text-white mb-2">5.3 Content Violations</h5>
              <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Post false, misleading, or fraudulent information</li>
                <li>Infringe upon intellectual property rights of others</li>
                <li>Post offensive, defamatory, or harassing content</li>
                <li>Impersonate any person or entity</li>
                <li>Collect or harvest information about other users</li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded border-l-4 border-blue-400">
              <h5 className="font-semibold text-gray-900 dark:text-white mb-2">5.4 Commercial Misconduct</h5>
              <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Engage in price manipulation or market manipulation</li>
                <li>Create fake reviews or ratings</li>
                <li>Circumvent payment systems or fees</li>
                <li>Resell services without authorization</li>
                <li>Engage in any activity that could harm our business reputation</li>
              </ul>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded mt-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Consequences:</strong> Violation of these prohibitions may result in immediate 
              account suspension or termination, legal action, and reporting to relevant authorities. 
              We reserve the right to investigate and prosecute violations to the fullest extent 
              of the law.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'payments',
      title: '6. Payments, Fees, and Refunds',
      icon: <FaBalanceScale className="text-green-500" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">6.1 Payment Terms</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            All payments must be made through approved payment methods. You agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>Provide valid payment information</li>
            <li>Authorize BuySellClub to charge your payment method for all fees and charges</li>
            <li>Pay all applicable fees, taxes, and charges in a timely manner</li>
            <li>Understand that prices may change without notice, but orders are confirmed at the price at time of purchase</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">6.2 Service Fees</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Our service may include various fees:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>Transaction Fees:</strong> Applied to purchases and service orders</li>
            <li><strong>Shipping Fees:</strong> Calculated based on weight, dimensions, and destination</li>
            <li><strong>Service Fees:</strong> For Buy4Me, training, and premium services</li>
            <li><strong>Currency Conversion Fees:</strong> Applied to cross-border transactions</li>
            <li><strong>Processing Fees:</strong> For payment processing and administrative costs</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">6.3 Refund Policy</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Refund eligibility depends on the specific service:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>Product Orders:</strong> Subject to our return policy (typically 72 hours after pickup)</li>
            <li><strong>Buy4Me Services:</strong> Refundable if procurement fails or service is not delivered as specified</li>
            <li><strong>Training Courses:</strong> Refundable if course is cancelled or rescheduled beyond 7 days</li>
            <li><strong>Shipping Services:</strong> Non-refundable once shipment is in transit, except for service failures</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
            All refund requests must be submitted within the applicable timeframes and are subject 
            to review and approval. Processing fees may be non-refundable.
          </p>
        </div>
      )
    },
    {
      id: 'intellectual',
      title: '7. Intellectual Property Rights',
      icon: <FaGavel className="text-teal-500" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">7.1 Our Intellectual Property</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            All content, features, and functionality of the Service, including but not limited to 
            text, graphics, logos, icons, images, audio clips, digital downloads, data compilations, 
            and software, are the exclusive property of BuySellClub or its content suppliers and 
            are protected by international copyright, trademark, patent, trade secret, and other 
            intellectual property laws.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">7.2 Limited License</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            We grant you a limited, non-exclusive, non-transferable, revocable license to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>Access and use the Service for personal or commercial purposes in accordance with these Terms</li>
            <li>Download or print content for your personal, non-commercial use</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
            This license does not include any right to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>Resell or commercially use the Service or its content</li>
            <li>Collect and use product listings, descriptions, or prices</li>
            <li>Derivative use of the Service or its contents</li>
            <li>Downloading or copying account information for the benefit of another merchant</li>
            <li>Use data mining, robots, or similar data gathering and extraction tools</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">7.3 User Content</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            By posting, uploading, or submitting content to the Service, you grant BuySellClub a 
            worldwide, royalty-free, perpetual, irrevocable, non-exclusive license to use, reproduce, 
            modify, adapt, publish, translate, distribute, and display such content for the purpose 
            of operating and promoting the Service.
          </p>
        </div>
      )
    },
    {
      id: 'liability',
      title: '8. Limitation of Liability and Disclaimers',
      icon: <FaExclamationTriangle className="text-yellow-500" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">8.1 Service Disclaimer</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF 
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">8.2 Limitation of Liability</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, BUYSELLCLUB SHALL NOT BE LIABLE FOR:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>Indirect, incidental, special, consequential, or punitive damages</li>
            <li>Loss of profits, revenue, data, or use</li>
            <li>Business interruption or loss of business opportunities</li>
            <li>Damages resulting from delays, shipping issues, or customs problems</li>
            <li>Third-party actions or content</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">8.3 Maximum Liability</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Our total liability to you for all claims arising from or related to the Service shall 
            not exceed the amount you paid to us in the twelve (12) months preceding the claim, 
            or GHS 10,000, whichever is greater.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">8.4 Force Majeure</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            We shall not be liable for any failure or delay in performance due to circumstances 
            beyond our reasonable control, including natural disasters, war, terrorism, labor 
            disputes, government actions, or failures of third-party service providers.
          </p>
        </div>
      )
    },
    {
      id: 'termination',
      title: '9. Account Termination',
      icon: <FaBan className="text-red-500" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">9.1 Termination by You</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            You may terminate your account at any time by contacting our support team or using 
            the account deletion feature in your account settings. Upon termination:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>Your right to use the Service will immediately cease</li>
            <li>All outstanding fees and charges must be paid</li>
            <li>We may delete or anonymize your account data in accordance with our Privacy Policy</li>
            <li>Some information may be retained as required by law or for legitimate business purposes</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">9.2 Termination by Us</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            We may suspend or terminate your account immediately, without prior notice, if:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>You violate these Terms or any applicable law</li>
            <li>You engage in fraudulent, abusive, or illegal activity</li>
            <li>You fail to pay fees when due</li>
            <li>We suspect unauthorized access to your account</li>
            <li>Required by law or regulatory authority</li>
          </ul>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">9.3 Effect of Termination</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Upon termination, all provisions of these Terms that by their nature should survive 
            termination shall survive, including ownership provisions, warranty disclaimers, 
            indemnity, and limitations of liability.
          </p>
        </div>
      )
    },
    {
      id: 'disputes',
      title: '10. Dispute Resolution and Governing Law',
      icon: <FaBalanceScale className="text-blue-500" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">10.1 Governing Law</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of Ghana, 
            without regard to its conflict of law provisions. Any disputes arising from these 
            Terms or the Service shall be subject to the exclusive jurisdiction of the courts 
            of Ghana.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">10.2 Dispute Resolution Process</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Before initiating any legal proceedings, parties agree to:
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>Informal Negotiation:</strong> Attempt to resolve disputes through good faith negotiation for 30 days</li>
            <li><strong>Mediation:</strong> If negotiation fails, engage in mediation through a mutually agreed mediator</li>
            <li><strong>Arbitration:</strong> If mediation fails, disputes shall be resolved through binding arbitration under Ghana ADR Act</li>
            <li><strong>Court Proceedings:</strong> Only as a last resort or for matters not subject to arbitration</li>
          </ol>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">10.3 Class Action Waiver</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            You agree that any disputes will be resolved individually and not as part of a class, 
            consolidated, or representative action. You waive any right to participate in class 
            action lawsuits or class-wide arbitrations.
          </p>
        </div>
      )
    },
    {
      id: 'changes',
      title: '11. Modifications to Terms',
      icon: <FaFileContract className="text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            We reserve the right to modify these Terms at any time. We will notify you of material 
            changes by:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
            <li>Posting the updated Terms on our website with a new "Last Updated" date</li>
            <li>Sending an email notification to the email address associated with your account</li>
            <li>Displaying a prominent notice on the Service</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
            Your continued use of the Service after such modifications constitutes acceptance of 
            the updated Terms. If you do not agree to the modified Terms, you must stop using 
            the Service and may terminate your account.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 rounded mt-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Recommendation:</strong> We encourage you to review these Terms periodically 
              to stay informed of any updates. Material changes will be effective 30 days after 
              notification, unless immediate changes are required by law.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'misc',
      title: '12. Miscellaneous Provisions',
      icon: <FaGavel className="text-gray-500" />,
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">12.1 Entire Agreement</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            These Terms, together with our Privacy Policy and any other legal notices published 
            on the Service, constitute the entire agreement between you and BuySellClub regarding 
            the Service.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">12.2 Severability</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            If any provision of these Terms is found to be unenforceable or invalid, that provision 
            shall be limited or eliminated to the minimum extent necessary, and the remaining 
            provisions shall remain in full force and effect.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">12.3 Waiver</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Our failure to enforce any right or provision of these Terms shall not constitute a 
            waiver of such right or provision unless acknowledged and agreed to by us in writing.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">12.4 Assignment</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            You may not assign or transfer these Terms or your rights hereunder without our prior 
            written consent. We may assign these Terms or any rights hereunder without restriction.
          </p>

          <h4 className="font-semibold text-gray-900 dark:text-white mt-6">12.5 Relationship</h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Nothing in these Terms creates a partnership, joint venture, employment, or agency 
            relationship between you and BuySellClub.
          </p>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/Signup"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-4"
          >
            <FaArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back to Sign Up</span>
          </Link>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FaGavel className="text-3xl text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  Terms and Conditions
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Last updated: {new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Please read these Terms and Conditions carefully before using BuySellClub's services. 
              These Terms govern your access to and use of our platform, services, and website. 
              By creating an account or using our services, you agree to be bound by these Terms.
            </p>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 sticky top-4 z-10">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Navigation</h3>
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-primary hover:text-white hover:border-primary transition-colors"
              >
                {section.title.split('.')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Terms Sections */}
        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {section.icon}
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-left">
                    {section.title}
                  </h2>
                </div>
                <span className="text-gray-400">
                  {activeSection === section.id ? '−' : '+'}
                </span>
              </button>
              
              {activeSection === section.id && (
                <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="pt-6">
                    {section.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-8 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl shadow-lg p-8 border border-primary/20">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <FaEnvelope className="text-primary" />
            Questions About These Terms?
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            If you have any questions, concerns, or need clarification about these Terms and 
            Conditions, please don't hesitate to contact our legal team. We're here to help.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <FaEnvelope className="text-primary mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Email</p>
                <a 
                  href="mailto:" 
                  className="text-primary hover:underline"
                >
                  support@fofoofogroup.com
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FaPhone className="text-primary mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Phone</p>
                <a 
                  href="tel:+233540266839" 
                  className="text-primary hover:underline"
                >
                  +233 540266839
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            By using BuySellClub's services, you acknowledge that you have read, understood, 
            and agree to be bound by these Terms and Conditions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;

