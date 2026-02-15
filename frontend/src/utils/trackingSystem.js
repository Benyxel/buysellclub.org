// Admin class
class AdminUpdate {
  constructor() {
    this.adminTracking = []; // Admin's tracking numbers
  }

  adminCheck(trackNum) {
    const normalizedTrackNum = trackNum.toUpperCase();
    return this.adminTracking.find(
      (i) => i.TrackingNum && i.TrackingNum.toUpperCase() === normalizedTrackNum
    );
  }

  adminAdd(trackNum, status) {
    this.adminTracking.push({
      TrackingNum: trackNum,
      Status: status,
      LastUpdated: new Date().toISOString(),
    });
    return `Tracking number ${trackNum} has been added successfully by admin`;
  }
}

// User class
class UserAdd extends AdminUpdate {
  constructor() {
    super();
    this.userTracking = new Map();
    this.statusHistory = new Map();
  }

  userAdd(trackNum, name, quantity, product, userId, userTrackingNum = null) {
    const normalizedTrackNum = trackNum.toUpperCase();
    const adminShipment = this.adminCheck(normalizedTrackNum);
    const userShipments = this.userTracking.get(userId) || [];
    const existingUserShipment = userShipments.find(
      (i) => i.TrackingNum && i.TrackingNum.toUpperCase() === normalizedTrackNum
    );

    if (existingUserShipment) {
      return {
        success: false,
        message: "You have already added this tracking number.",
      };
    }

    const sender = name || "";
    const qty =
      Number.isFinite(Number(quantity)) && Number(quantity) > 0
        ? Number(quantity)
        : 1;
    const prod = product || "Package";

    userShipments.push({
      TrackingNum: normalizedTrackNum,
      Sender: sender,
      Quantity: qty,
      Product: prod,
      UserTrackingNum: userTrackingNum || null,
      Status: (adminShipment && adminShipment.Status) || "Pending",
      AddedDate: new Date().toISOString(),
      LastUpdated: new Date().toISOString(),
    });

    this.userTracking.set(userId, userShipments);

    if (!this.statusHistory.has(normalizedTrackNum)) {
      this.statusHistory.set(normalizedTrackNum, [
        {
          status: (adminShipment && adminShipment.Status) || "Pending",
          date: new Date().toISOString(),
          details: adminShipment
            ? "Initial status from admin"
            : "User added; awaiting admin to register the tracking",
        },
      ]);
    }

    this.saveToLocalStorage();

    return {
      success: true,
      message: `Tracking number ${normalizedTrackNum} has been added successfully with ${quantity} quantity for ${name}. ${
        adminShipment
          ? "Initial status seeded from admin."
          : "Waiting for admin to add it to the system."
      }`,
    };
  }

  getUserShipments(userId) {
    return this.userTracking.get(userId) || [];
  }

  getUserShipment(userId, trackNum) {
    const userShipments = this.userTracking.get(userId) || [];
    return userShipments.find((shipment) => shipment.TrackingNum === trackNum);
  }

  saveToLocalStorage() {
    const data = {
      userTracking: Array.from(this.userTracking.entries()),
      statusHistory: Array.from(this.statusHistory.entries()),
      adminTracking: this.adminTracking,
    };
    localStorage.setItem("shippingData", JSON.stringify(data));
  }

  loadFromLocalStorage() {
    const data = localStorage.getItem("shippingData");
    if (data) {
      try {
        const parsedData = JSON.parse(data);
        this.userTracking = new Map(parsedData.userTracking || []);
        this.statusHistory = new Map(parsedData.statusHistory || []);
        this.adminTracking = parsedData.adminTracking || [];
      } catch (error) {
        console.error("Error loading shipping data:", error);
        this.userTracking = new Map();
        this.statusHistory = new Map();
        this.adminTracking = [];
      }
    }
  }

  userCheck(trackNum, userId) {
    const userShipment = this.getUserShipment(userId, trackNum);

    if (!userShipment) {
      const adminShipment = this.adminCheck(trackNum);

      if (adminShipment) {
        return {
          found: false,
          message: `
            ✅ Tracking Number Found in System
            ===============================
            
            Good news! The tracking number ${trackNum} has been added by our admin team.
            
            Current Status: ${adminShipment.Status}
            Last Updated: ${
              adminShipment.LastUpdated
                ? new Date(adminShipment.LastUpdated).toLocaleDateString()
                : "Not available"
            }
            
            To add this to your account and track it:
            1. Click the "Add This Tracking Number" button below
            2. Enter your details (name, quantity, product)
            3. Submit the form
            
            After adding the shipment, you'll be able to get detailed tracking updates.
          `,
          needsUserAdd: true,
          adminData: adminShipment,
        };
      }

      return {
        found: false,
        message: `
          ❌ Tracking Number Not Found
          ===========================
          
          The tracking number ${trackNum} is not found in our system.
          
          Please follow these steps:
          1. Contact the admin to add this tracking number to the system
          2. Once added, you can add it to your account
          3. Then you can track it here
          
          Need help? Contact support at support@buysellclub.org
        `,
        needsUserAdd: false,
      };
    }

    const currentDate = new Date();
    const estimatedDelivery = new Date(currentDate);
    estimatedDelivery.setDate(currentDate.getDate() + 60);

    const history = this.getStatusHistory(trackNum);
    const historySection =
      history.length > 1
        ? `
      📋 Status History:
      -----------------
      ${history
        .map(
          (entry) => `
        ${new Date(entry.date).toLocaleString()}: ${entry.status}
      `
        )
        .join("\n")}
    `
        : "";

    let statusMessage = "";
    switch (userShipment.Status) {
      case "Delivered":
        statusMessage =
          "✅ Delivery Status: Your package has been successfully delivered to your address!";
        break;
      case "In Transit":
        statusMessage =
          "🚚 Delivery Status: Your package is currently in transit and on its way to you.";
        break;
      case "Pending":
        statusMessage =
          "⏳ Delivery Status: Your package is pending processing at our facility.";
        break;
      case "On Return":
        statusMessage =
          "⚠️ Delivery Status: Your package is being returned to the sender. Please contact your seller for more information.";
        break;
      case "In China Warehouse":
        statusMessage =
          "🏭 Delivery Status: Your package is currently in our China warehouse awaiting shipping.";
        break;
      case "On Way to Warehouse":
        statusMessage =
          "🚛 Delivery Status: Your package is on its way to our warehouse for shipping.";
        break;
      default:
        statusMessage =
          "ℹ️ Delivery Status: Your package is being received by the warehouse.";
    }

    const message = `
      📦 Shipment Tracking Information
      ==============================
      
      🔍 Tracking Details:
      -------------------
      Tracking Number: ${userShipment.TrackingNum}
      Customer Name: ${userShipment.Sender}
      Product: ${userShipment.Product}
      Quantity: ${userShipment.Quantity}
      Added to Profile: ${new Date(userShipment.AddedDate).toLocaleDateString()}
      
      📊 Status Information:
      ---------------------
      Current Status: ${userShipment.Status}
      Last Updated: ${new Date(userShipment.LastUpdated).toLocaleString()}
      ${
        userShipment.Status !== "On Return"
          ? `Estimated Delivery: ${estimatedDelivery.toLocaleDateString()}`
          : ""
      }
      
      ${statusMessage}
      
      ${historySection}
      
      📞 Need Help?
      -------------
      If you have any questions about your shipment, please contact our support team at:
      Email: support@buysellclub.org
      Phone: 233-540266839
      
      Thank you for choosing our shipping service!
    `;

    return {
      found: true,
      message: message,
      needsUserAdd: false,
    };
  }

  getAllShipments() {
    const allShipments = [];
    for (const [, userShipments] of this.userTracking) {
      allShipments.push(...userShipments);
    }
    return allShipments;
  }

  getStatusHistory(trackNum) {
    return this.statusHistory.get(trackNum) || [];
  }

  updateStatusHistory(trackNum, newStatus) {
    const history = this.statusHistory.get(trackNum) || [];
    history.push({
      status: newStatus,
      date: new Date().toISOString(),
      details: `Status updated to ${newStatus}`,
    });
    this.statusHistory.set(trackNum, history);
  }
}

const trackingSystem = new UserAdd();
trackingSystem.loadFromLocalStorage();

export { trackingSystem };
