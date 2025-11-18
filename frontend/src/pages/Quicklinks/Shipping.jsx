import React, { useState } from "react";
import API from "../../api";

const Shipping = () => {
  const [shippingAddress, setShippingAddress] = useState([
    "FOFOOFOIMPORT  Phone number :18084390850 Address:广东省深圳市宝安区石岩街道金台路7号伟建产业园B栋106户*fofoofo 加纳",
  ]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState(""); // Single message state
  const [copySuccess, setCopySuccess] = useState("");
  const [combinedAddress, setCombinedAddress] = useState(""); // Store the combined address separately

  const handleAddress = () => {
    if (name.trim() === "") {
      setMessage("Name is required");
    } else {
      const newCombinedAddress = `${shippingAddress[0]} ${name}`;
      setShippingAddress([...shippingAddress, newCombinedAddress]);
      setCombinedAddress(newCombinedAddress); // Save the combined address
      setMessage(
        `Dear ${name},\n\n` +
          `Your Shipping Address has been successfully generated:\n` +
          `(${newCombinedAddress})\n\n` +
          `Shipping Mark: M856:${name}\n\n` +
          `NOTE: Please add all your tracking numbers in the "Add a Tracking Number" section.\n` +
          `\n---\n` +
          `Thank you for using our service! If you have any questions, feel free to contact our support team.\n` +
          `We wish you a smooth and hassle-free shipping experience!`
      );
      setCopySuccess(""); // Reset copy success message
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(combinedAddress).then(() => {
      setCopySuccess("Address copied to clipboard!");
    });
  };

  // Tracking
  const [adminInput, setAdminInput] = useState({
    trackNum: "",
    name: "",
    status: "",
  });
  const [userInput, setUserInput] = useState({
    trackNum: "",
  });

  const handleAdminAdd = () => {
    const { trackNum, name, status } = adminInput;
    if (trackNum && name && status) {
      // Store in localStorage for profile tracking tab
      try {
        const stored = localStorage.getItem("userTrackings");
        let trackings = [];
        if (stored) {
          trackings = JSON.parse(stored);
        }

        // Add new tracking to localStorage
        const newTracking = {
          TrackingNum: trackNum.toUpperCase(),
          ShippingMark: `M856:${name}`,
          Status: status,
          CBM: "",
          Action: "",
          AddedDate: new Date().toISOString(),
          LastUpdated: new Date().toISOString(),
          id: Date.now(),
        };

        trackings.push(newTracking);
        localStorage.setItem("userTrackings", JSON.stringify(trackings));
        console.log("✅ Admin saved to localStorage:", newTracking);
        console.log("📦 Total trackings in storage:", trackings.length);
      } catch (e) {
        console.error("❌ Failed to save to localStorage:", e);
      }

      setMessage(`Tracking number ${trackNum} has been added successfully.`);
    } else {
      setMessage("All fields are required for Admin Add.");
    }
  };

  const handleUserAdd = async () => {
    const { trackNum } = userInput;
    const tn = (trackNum || "").toUpperCase().trim();
    if (!tn) {
      setMessage("Please enter a tracking number.");
      return;
    }
    try {
      // 1) Check if tracking already exists in backend
      await API.get(
        `/buysellapi/trackings/by-number/${encodeURIComponent(tn)}/`
      );
      // If we got here with 200, it exists already
      setMessage(`Tracking number ${tn} already exists in the system.`);
      setUserInput({ trackNum: "" });
      return;
    } catch (err) {
      if (err?.response?.status && err.response.status !== 404) {
        // Non-404 error (e.g., 401)
        if (err.response.status === 401) {
          setMessage("Please log in to add a new shipment.");
        } else {
          setMessage("Could not verify tracking status. Please try again.");
        }
        return;
      }
    }

    // 2) Create in backend with sensible defaults for required fields
    try {
      // Fetch the user's permanent shipping mark from backend
      let smark = "N/A";
      try {
        const smResp = await API.get("/buysellapi/shipping-marks/me/");
        const sm = smResp?.data;
        if (sm && (sm.shippingMark || (sm.markId && sm.name))) {
          smark = sm.shippingMark || `${sm.markId}:${sm.name}`;
        }
      } catch (e) {
        if (e?.response?.status === 404) {
          setMessage(
            "Please generate your shipping address first so we can use your permanent shipping mark."
          );
          return;
        }
      }
      const payload = {
        tracking_number: tn,
        shipping_mark: smark,
        status: "pending",
        cbm: 0,
        action: "",
      };
      const res = await API.post("/buysellapi/trackings/", payload);
      if (res.status === 201 || res.status === 200) {
        setMessage(`Tracking number ${tn} has been added successfully.`);
        setUserInput({ trackNum: "" });

        // Store in localStorage for profile tracking tab
        try {
          const stored = localStorage.getItem("userTrackings");
          let trackings = [];
          if (stored) {
            trackings = JSON.parse(stored);
          }

          // Add new tracking to localStorage
          const newTracking = {
            TrackingNum: tn,
            ShippingMark: smark,
            Status: "Pending",
            CBM: "",
            Action: "",
            AddedDate: new Date().toISOString(),
            LastUpdated: new Date().toISOString(),
            id: Date.now(),
          };

          trackings.push(newTracking);
          localStorage.setItem("userTrackings", JSON.stringify(trackings));
          console.log("✅ Saved to localStorage:", newTracking);
          console.log("📦 Total trackings in storage:", trackings.length);
        } catch (e) {
          console.error("❌ Failed to save to localStorage:", e);
        }

        return;
      }
      setMessage("Unexpected response from server. Please try again.");
    } catch (err) {
      if (err?.response?.status === 401) {
        setMessage("Please log in to add a new shipment.");
      } else if (err?.response?.status === 400) {
        // Likely validation error such as duplicate or required fields
        const data = err.response.data || {};
        if (data.tracking_number) {
          setMessage(`Tracking number ${tn} already exists.`);
        } else {
          setMessage("Invalid data. Please check and try again.");
        }
      } else {
        setMessage("Failed to add shipment. Please try again later.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          fofoofoImport Shipping Address Generator
        </h1>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <button
          onClick={handleAddress}
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-300"
        >
          Generate Address
        </button>
        <pre className="mt-4 bg-gray-100 p-4 rounded-md text-gray-700 whitespace-pre-wrap">
          {message}
        </pre>
        {combinedAddress && (
          <button
            onClick={handleCopy}
            className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition duration-300 mt-4"
          >
            Copy Address to Clipboard
          </button>
        )}
        {copySuccess && (
          <p className="text-green-600 text-center mt-2">{copySuccess}</p>
        )}
      </div>

      <div className="mt-10 bg-white shadow-md rounded-lg p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Tracking System
        </h1>

        {/* Admin Add Section */}
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Admin Add</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter tracking number"
            value={adminInput.trackNum}
            onChange={(e) =>
              setAdminInput({
                ...adminInput,
                trackNum: e.target.value.toUpperCase(),
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Enter user name"
            value={adminInput.name}
            onChange={(e) =>
              setAdminInput({ ...adminInput, name: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Enter package status"
            value={adminInput.status}
            onChange={(e) =>
              setAdminInput({ ...adminInput, status: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdminAdd}
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-300"
          >
            Add as Admin
          </button>
        </div>

        {/* Add New Shipment (Tracking Number only) */}
        <h2 className="text-xl font-semibold text-gray-700 mt-8 mb-4">
          Add New Shipment
        </h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter tracking number"
            value={userInput.trackNum}
            onChange={(e) =>
              setUserInput({
                trackNum: e.target.value.toUpperCase(),
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleUserAdd}
            className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition duration-300"
          >
            Add New Shipment
          </button>
        </div>

        {/* Track Your Shipment */}
        <h2 className="text-xl font-semibold text-gray-700 mt-8 mb-4">
          Track Your Shipment
        </h2>
        <div className="space-y-4">
          <p className="text-gray-600 text-sm mb-4">
            Want to check the status of your tracking number? Use our tracking
            page for detailed information.
          </p>
          <a
            href="/tracking"
            className="block w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-300 text-center"
          >
            Go to Tracking Page
          </a>
        </div>

        {/* Message Section */}
        <h3 className="text-lg font-semibold text-gray-700 mt-8">Message</h3>
        <pre className="mt-2 bg-gray-100 p-4 rounded-md text-gray-700 whitespace-pre-wrap">
          {message}
        </pre>
      </div>
    </div>
  );
};

export default Shipping;
