import React from "react";
import {
  FaTruck,
  FaAlipay,
  FaHandHoldingUsd,
  FaGraduationCap,
  FaStore,
  FaShieldAlt,
  FaWarehouse,
  FaBalanceScale,
} from "react-icons/fa";

const policySections = [
  {
    id: "shipping",
    title: "Terms & Conditions & Shipping Guide",
    icon: <FaTruck className="text-blue-600 text-3xl" />,
    description:
      "Fofoofo Imports – Terms & Conditions & Shipping Guide (Operated by Fofoofo Group PTY LTD). By using the services of Fofoofo Imports, you agree to abide by the following Terms and Conditions and comply with all applicable laws. If you do not agree, please do not use our services.",
    content: (
      <div className="space-y-6 text-gray-700 dark:text-gray-300">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            📦 GENERAL TERMS & CONDITIONS
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Estimated Delivery Period
              </h4>
              <p>
                Delivery times are <strong>not 100% guaranteed</strong> due to unforeseen circumstances such as flight delays, customs clearance, inspections, holidays, or port issues. All delivery timelines provided are <strong>estimates based on the past two (2) months' performance</strong>.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Dangerous Goods Disclosure
              </h4>
              <p>
                Clients must <strong>fully declare all dangerous or restricted goods</strong>. Failure to do so makes the client <strong>fully liable</strong> for any penalties, losses, seizures, or damages incurred.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Transparency & Proper Labeling
              </h4>
              <p>
                All clients must be <strong>honest about the contents</strong> of their packages. Clients must ensure suppliers <strong>properly label parcels</strong>, clearly indicating:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Product name</li>
                <li>Quantity</li>
                <li>Correct <strong>shipping mark</strong></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Warehouse Address
              </h4>
              <p>
                Clients must <strong>confirm and generate the correct warehouse address</strong> before shipping goods. Fofoofo Imports will not be responsible for items sent to incorrect addresses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Extra Fees
              </h4>
              <p>
                Certain items such as <strong>cosmetics, liquids, batteries, and some electronics</strong> may attract <strong>additional customs or handling fees</strong> when shipping to Ghana.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Pickup Deadline
              </h4>
              <p>
                Goods must be <strong>picked up within 7 days</strong> of arrival notification. A <strong>$5 per day penalty</strong> applies after the 7-day grace period.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Parcel Inspection
              </h4>
              <p>
                Clients must <strong>inspect their parcels at our office upon pickup</strong>. Any issues reported <strong>after leaving our premises will not be accepted</strong>.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Product Quality Disclaimer
              </h4>
              <p>
                Fofoofo Imports <strong>does not guarantee product quality or condition</strong>. We deliver items <strong>exactly as received from suppliers</strong>.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Electronics Disclaimer
              </h4>
              <p>
                We <strong>do not guarantee the full functionality</strong> of electronic items.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Unclaimed Goods
              </h4>
              <p>
                Goods not picked up within <strong>one (1) month</strong> of arrival will be <strong>disposed of or sold</strong> without notice or compensation.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            💸 REFUNDS & COMPENSATIONS
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Fragile Items
              </h4>
              <p>
                No refunds or compensation for damage to <strong>glass, liquid, ceramic, or fragile items</strong>. Clients may request <strong>extra protective or wooden packaging</strong> at an additional cost.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Supplier Responsibility
              </h4>
              <p>
                Fofoofo Imports is <strong>not responsible for product quality</strong> when the supplier was <strong>chosen by the client</strong>.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Shipping Delays
              </h4>
              <p>
                No refunds for delays caused by <strong>weather, customs inspections, port congestion, or government regulations</strong>.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Buy-For-Me Service
              </h4>
              <p>
                No refunds for goods or shipping when <strong>client-provided product links</strong> are used. Clients are responsible for supplier research.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Packaging Responsibility
              </h4>
              <p>
                We are <strong>not liable for damages</strong> caused by poor packaging or incorrect labeling by suppliers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Procurement-Based Refunds
              </h4>
              <p>
                If Fofoofo Imports procures goods on your behalf, compensation (if applicable) will be <strong>up to 70% of product value</strong>. The client bears the remaining <strong>30% risk</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            ⚠️ IMPORTANT PAYMENT & STORAGE POLICY (NEW)
          </h3>
          <ul className="space-y-2">
            <li>
              If a client is <strong>unable to pay shipping fees within 14 days (2 weeks)</strong> of being billed, 👉 <strong>the goods will be sold without refund</strong> to recover costs.
            </li>
            <li>
              Late payments attract a <strong>$5 per day penalty</strong>.
            </li>
            <li>
              Goods unpaid after <strong>one (1) month</strong> will be sold <strong>with no refund</strong>.
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            📝 IMPORTANT NOTES
          </h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Fragile items must be <strong>wooden-framed, otherwise the client accepts full risk</strong>.</li>
            <li><strong>Shipping mark must be in the format "FIM-###" + client name</strong>.</li>
            <li><strong>No cash payments accepted</strong> — only approved electronic payment methods.</li>
            <li>Our <strong>air shipping address is the same as our sea shipping address</strong>.</li>
            <li>Clients must <strong>notify us in advance</strong> of any items intended for <strong>air shipping</strong>.</li>
          </ul>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            🚨 VERY IMPORTANT
          </h3>
          <p>
            Failure to comply with these terms may result in <strong>delays, penalties, seizure of goods, or loss without compensation</strong>.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "alipay",
    title: "Alipay & Cross-Border Payment Policy",
    icon: <FaAlipay className="text-indigo-600 text-3xl" />,
    description:
      "Secure settlement flow for supplier payments, FX management, and reconciliation.",
    commitments: [
      "Daily CNY clearing window (09:00–13:00 GMT).",
      "FX spreads published each morning; rate locked once invoice is issued.",
      "Two-factor approval for every payout above ¥50,000.",
      "Chargebacks resolved within 3 working days.",
    ],
    compliance: [
      "KYC/KYB checks before onboarding wallets.",
      "PEP / sanctions screening via Dow Jones Watchlist.",
      "PCI-DSS compliant storage of masked payment references.",
    ],
  },
  {
    id: "buy4me",
    title: "Buy4Me Procurement Policy",
    icon: <FaHandHoldingUsd className="text-emerald-600 text-3xl" />,
    description:
      "Special handling rules for sourcing, purchase assurance, and dispute mediation.",
    commitments: [
      "Supplier vetting scorecard (quality, responsiveness, trade references).",
      "Mandatory photo / video verification before dispatch.",
      "Escrow-style milestone: client funds held until quality approval.",
      "Free re-sourcing if supplier fails agreed specs.",
    ],
    compliance: [
      "Transparent service fee matrix published on the dashboard.",
      "Refunds processed within 5 business days if procurement fails.",
      "All communication logged inside the order timeline for audit.",
    ],
  },
  {
    id: "training",
    title: "Training & Capacity-Building Policy",
    icon: <FaGraduationCap className="text-yellow-600 text-3xl" />,
    description:
      "Guidelines for premium classes, webinar recordings, and attendee data.",
    commitments: [
      "Curriculum reviewed quarterly for compliance with GRA import reforms.",
      "Attendance records shared within 48 hours, certificates within 7 days.",
      "Refunds honoured if class is cancelled or rescheduled beyond 7 days.",
      "Learning materials secured behind authenticated portals.",
    ],
    compliance: [
      "Trainers sign NDAs covering proprietary sourcing methods.",
      "Participant data kept under GDPR & Ghana Data Protection Act controls.",
    ],
  },
  {
    id: "shop",
    title: "Shop, Returns & Customer Care Policy",
    icon: <FaStore className="text-pink-600 text-3xl" />,
    description:
      "Retail & wholesale commitments for product listings, returns, and warranty.",
    commitments: [
      "Sku-level traceability (batch, supplier, inspection date).",
      "Return window: 72 hours after pickup; defects documented via portal.",
      "Warranty decisions within 5 business days.",
      "Live chat + phone support 08:00–22:00 GMT daily.",
    ],
    compliance: [
      "Consumer Protection Act (Ghana) compliance on disclaimers & refund timelines.",
      "Hazmat and temperature-sensitive goods flagged with handling labels.",
      "Carbon impact metrics published quarterly for sustainability reporting.",
    ],
  },
  {
    id: "compliance",
    title: "Data Protection & Compliance Policy",
    icon: <FaShieldAlt className="text-slate-600 text-3xl" />,
    description:
      "Enterprise-grade controls for personal data, shipment records, and vendor contracts.",
    commitments: [
      "Role-based access enforced through IAM + MFA.",
      "Logs retained for 400 days with tamper alerts.",
      "Quarterly penetration tests and annual SOC 2 gap review.",
    ],
    compliance: [
      "GDPR, Ghana Data Protection Act, and PCI scope documented.",
      "Data Processing Agreements signed with every upstream vendor.",
      "Incident response playbook with 24h notification SLA.",
    ],
  },
  {
    id: "operations",
    title: "Logistics & Operations Governance",
    icon: <FaWarehouse className="text-orange-600 text-3xl" />,
    description:
      "Warehouse, inventory, and fleet standards expected from a professional logistics provider.",
    commitments: [
      "Cycle counts weekly; full stocktake monthly.",
      "Warehouse CCTV stored for 90 days.",
      "Temperature & humidity monitoring in consolidation centres.",
      "Fleet maintenance log (oil, tyres, brakes) updated per trip.",
    ],
    compliance: [
      "ISO 9001 & ISO 28000-aligned SOPs.",
      "HSSE toolbox talks before each shift.",
      "3PL partners audited twice a year.",
    ],
  },
  {
    id: "disputes",
    title: "Dispute Resolution & Escalation Policy",
    icon: <FaBalanceScale className="text-purple-600 text-3xl" />,
    description:
      "Clear playbook for claims, loss reporting, and executive escalation.",
    commitments: [
      "Ticket acknowledgement within 4 business hours.",
      "Root-cause analysis shared within 3 working days.",
      "Compensation path determined within 7 working days.",
      "Executive review board convenes for claims above GHS 50,000.",
    ],
    compliance: [
      "Evidence (photos, waybills, CCTV) archived with every case.",
      "Arbitration clause referencing Ghana ADR Act.",
      "Periodic reporting to clients on open disputes.",
    ],
  },
];

const Policies = () => {
  return (
    <section className="bg-gray-50 dark:bg-gray-900 dark:text-white py-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Policy Center
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mt-2">
            Operational & Client Policies
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-4 max-w-3xl mx-auto">
            Everything clients, partners, and regulators need to know about how
            BuySellClub executes logistics, payments, procurement, and training
            services across the China–Ghana corridor.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {policySections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="px-4 py-2 rounded-full text-sm font-medium border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
            >
              {section.title.replace(/ &.*/, "")}
            </a>
          ))}
        </div>

        <div className="grid gap-8">
          {policySections.map((section) => (
            <article
              key={section.id}
              id={section.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 md:p-8"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-primary/10 rounded-full">{section.icon}</div>
                <div>
                  <h2 className="text-2xl font-semibold">{section.title}</h2>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">
                    {section.description}
                  </p>
                </div>
              </div>

              {section.content ? (
                <div>{section.content}</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-primary">
                      Service Commitments
                    </h3>
                    <ul className="space-y-2 text-gray-700 dark:text-gray-200">
                      {section.commitments?.map((item, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-primary">
                      Compliance & Controls
                    </h3>
                    <ul className="space-y-2 text-gray-700 dark:text-gray-200">
                      {section.compliance?.map((item, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>

        <div className="mt-12 bg-primary/10 border border-primary/20 rounded-2xl p-6 md:p-8 text-center">
          <h3 className="text-xl font-bold mb-2">Need a custom SLA?</h3>
          <p className="text-gray-700 dark:text-gray-200 mb-4">
            Enterprise retailers, freight forwarders, and fintech partners can
            request bespoke policy addenda. Email{" "}
            <a
              href="mailto:support@buysellclub.org"
              className="text-primary font-semibold"
            >
              support@buysellclub.org
            </a>{" "}
            for a dedicated appointment.
          </p>
          <p className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Policies;

