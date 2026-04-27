import React from "react";
import ProfileCustomerDelivery from "../../components/profile/ProfileCustomerDelivery";

/**
 * Quick Link: same delivery request UI as Profile → Delivery, on its own route.
 */
export default function Delivery() {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-10 max-w-5xl">
      <ProfileCustomerDelivery />
    </div>
  );
}
