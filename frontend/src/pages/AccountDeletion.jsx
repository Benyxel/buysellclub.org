import React from "react";

const SUPPORT_EMAIL = "support@buysellclub.org";

export default function AccountDeletion() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-gray-800 dark:text-gray-200">
      <p className="text-sm font-semibold text-slate-500 mb-2">
        FOFOOFO IMPORTS · BuySellClub · Fofoofo Group
      </p>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Delete your account and data
      </h1>
      <p className="mb-8 leading-relaxed">
        This page is for users of the <strong>FOFOOFO IMPORTS</strong> mobile
        app (package <code>org.buysellclub.app</code>) and the BuySellClub
        website. You can request that your account and associated personal data
        be deleted at any time.
      </p>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">
        How to request deletion
      </h2>
      <ol className="list-decimal pl-6 space-y-3 leading-relaxed">
        <li>
          Email{" "}
          <a className="text-blue-600 underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          from the email address on your account.
        </li>
        <li>
          Use the subject line <strong>Account deletion request</strong>.
        </li>
        <li>
          Include your username or shipping mark so we can find the correct
          account.
        </li>
        <li>
          We will confirm the request and delete or anonymize your account
          within <strong>30 days</strong>.
        </li>
      </ol>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">
        Data we delete
      </h2>
      <ul className="list-disc pl-6 space-y-2 leading-relaxed">
        <li>Account profile (name, username, email, phone, shipping mark)</li>
        <li>Login credentials and Google Sign-In link</li>
        <li>In-app settings and saved login on our servers</li>
        <li>Support messages tied only to your account</li>
      </ul>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3">
        Data we may keep
      </h2>
      <p className="mb-3 leading-relaxed">
        We may retain the following as required by law or for legitimate
        business records (customs, tax, shipping, and fraud prevention):
      </p>
      <ul className="list-disc pl-6 space-y-2 leading-relaxed">
        <li>Shipment, invoice, and payment records</li>
        <li>Warehouse and customs paperwork</li>
        <li>Records needed to complete an unpaid or in-transit order</li>
      </ul>
      <p className="mt-4 leading-relaxed">
        Kept records are stored only as long as needed for those purposes,
        typically up to <strong>7 years</strong> for tax and shipping
        documents, then deleted or anonymized.
      </p>

      <p className="mt-10 text-sm text-slate-500">
        Developer: Fofoofo Group / BuySellClub. App: FOFOOFO IMPORTS on Google
        Play.
      </p>
    </div>
  );
}
