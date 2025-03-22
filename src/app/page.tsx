"use client";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { faPhone } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useState, useEffect } from "react";

type Contact = {
  id: number;
  name: string;
  primaryNumber: string;
  transactions: number[];
  totalOutstanding: number;
  paid: boolean;
  history: { change: number; date: string }[]; // New field to track history
};

export default function Home() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTab] = useState("showClients");
  const [name, setName] = useState("");
  const [primaryNumber, setPrimaryNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showHistory, setShowHistory] = useState<{ [key: number]: boolean }>({}); // Track visibility of history for each contact

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const res = await fetch("/api/contacts");
    const data = await res.json();
    setContacts(data);
    setFilteredContacts(data);
  };

  const addClient = async () => {
    if (!name || !primaryNumber) {
      alert("Please fill out all fields.");
      return;
    }

    const newClient = {
      id: Date.now(),
      name,
      primaryNumber,
      transactions: [],
      totalOutstanding: 0,
      paid: false,
    };

    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClient),
    });

    if (res.status === 400) {
      const errorData = await res.json();
      alert(errorData.error); // Display the error message from the backend
      return;
    }

    if (res.ok) {
      fetchContacts(); // Refresh the contact list
      setName("");
      setPrimaryNumber("");
    } else {
      alert("Failed to add client. Please try again.");
    }
  };

  const updateOutstanding = async (id: number, action: "increment" | "decrement") => {
    const amount = parseFloat(prompt(`Enter amount to ${action}:`) || "0");
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const contact = contacts.find((c) => c.id === id);
    if (!contact) {
      alert("Contact not found.");
      return;
    }

    let newOutstanding = contact.totalOutstanding;
    if (action === "increment") {
      newOutstanding += amount;
    } else if (action === "decrement") {
      newOutstanding -= amount;
      if (newOutstanding < 0) {
        alert("Outstanding amount cannot be negative.");
        return;
      }
    }

    await fetch("/api/contacts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, totalOutstanding: newOutstanding }),
    });

    fetchContacts(); // Refresh the contact list after updating
  };

  const sendWhatsAppReminder = (contact: Contact) => {
    const message = `Hello ${contact.name}, your outstanding amount is ₹${contact.totalOutstanding.toFixed(
      2
    )}. Please make the payment at your earliest convenience.`;
    const whatsappUrl = `https://wa.me/${contact.primaryNumber}?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, "_blank");
  };

  const deleteClient = async (id: number) => {
    if (confirm("Are you sure you want to delete this client?")) {
      await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
      });
      fetchContacts();
    }
  };

  const filterClients = () => {
    const query = searchQuery.toLowerCase();
    const filtered = contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.primaryNumber.includes(query)
    );
    setFilteredContacts(filtered);
  };

  const toggleHistory = (id: number) => {
    setShowHistory((prev) => ({
      ...prev,
      [id]: !prev[id], // Toggle the visibility of the history for the given contact ID
    }));
  };

  useEffect(() => {
    filterClients();
  }, [searchQuery]);

  return (
    <div className="container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <button onClick={() => setActiveTab("addClient")}>Add New Client</button>
        <button onClick={() => setActiveTab("showClients")}>View Clients</button>
        <button onClick={() => setActiveTab("settings")}>Settings</button>
      </nav>

      {/* Add Client Tab */}
      {activeTab === "addClient" && (
        <div className="add-client">
          <h2>Add a New Client</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter Client Name"
          />
          <input
            value={primaryNumber}
            onChange={(e) => setPrimaryNumber(e.target.value)}
            placeholder="Enter Phone Number"
          />
          <button onClick={addClient}>Add Client</button>
        </div>
      )}

      {/* Show Clients Tab */}
      {activeTab === "showClients" && (
  <div className="show-clients">
    {/* Calculate and display the total outstanding amount */}
    <h2 style={{ fontSize: "13px" }}>
  Total pending: 
  <span
    style={{
      color: "#b50000",
      marginLeft: "10px",
      fontSize: "16px",
    }}
  >
    ₹{contacts.reduce((sum, contact) => sum + contact.totalOutstanding, 0).toFixed(2)}
  </span>
</h2>

    {/* <h2 style={{ fontSize: "13px" }}>Clients with Outstanding Amounts</h2> */}
    {filteredContacts.map((contact) => (
      <div key={contact.id} className="client-item">
        <p>
          <strong>{contact.name}</strong> | 
          <span
            style={{
              color: "white",
              backgroundColor: "red",
              padding: "5px 10px",
              borderRadius: "5px",
              marginLeft: "10px",
              display: "inline-block",
            }}
          >
            ₹{contact.totalOutstanding.toFixed(2)}
          </span>
        </p>
        <p>Phone: {contact.primaryNumber}</p>
        <button onClick={() => updateOutstanding(contact.id, "increment")}>
          Add to Outstanding
        </button>
        <button onClick={() => updateOutstanding(contact.id, "decrement")}>
          Reduce Outstanding
        </button>
        <button onClick={() => sendWhatsAppReminder(contact)}>
          <FontAwesomeIcon icon={faWhatsapp} style={{ marginRight: "5px" }} />
          Send WhatsApp Reminder
        </button>
        <button
          onClick={() =>
            window.location.href = `tel:${contact.primaryNumber}`
          }
        >
          <FontAwesomeIcon icon={faPhone} style={{ marginRight: "5px" }} />
          Call Client
        </button>
        <button onClick={() => toggleHistory(contact.id)}>
          {showHistory[contact.id] ? "Hide History" : "View History"}
        </button>

        {/* Display History */}
        {showHistory[contact.id] && (
          <div className="history">
            <h4>Transaction History:</h4>
            <ul>
              {contact.history?.map((entry, index) => (
                <li
                  key={index}
                  style={{
                    color: entry.change > 0 ? "green" : "red",
                    backgroundColor: entry.change > 0 ? "#e6ffe6" : "#ffe6e6",
                    padding: "5px",
                    borderRadius: "5px",
                    marginBottom: "5px",
                  }}
                >
                  {entry.change > 0 ? "+" : ""}
                  {entry.change} on {new Date(entry.date).toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ))}
  </div>
)}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="settings">
          <h2>Settings</h2>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or phone number"
          />
          <h3>Client List</h3>
          {filteredContacts.map((contact) => (
            <div key={contact.id} className="client-item">
              <p>
                {contact.name} - {contact.primaryNumber}
              </p>
              <button onClick={() => deleteClient(contact.id)}>Delete Client</button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .container {
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .navbar {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          justify-content: center;
        }
        .navbar button {
              color: #fff;
    cursor: pointer;
    background: #572084;
    border: none;
    border-radius: 5px;
    padding: 10px 20px;
    font-size: 16px;
        }
        .navbar button:hover {
          background: #0056b3;
        }
        .add-client,
        .show-clients,
        .settings {
          margin-top: 20px;
        }
        .add-client input,
        .settings input {
          display: block;
          width: 100%;
          padding: 10px;
          margin-bottom: 10px;
          border: 1px solid #ccc;
          border-radius: 5px;
        }
        .client-item {
          border: 1px solid #ccc;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 5px;
          background:rgb(255, 255, 255);
         
        }
        .client-item button {
          color: #fff;
    cursor: pointer;
    background: #9f00ffd4;
    border: none;
    border-radius: 15px;
    margin: 5px;
    padding: 10px 13px;
        }
        .client-item button:hover {
          background: #0056b3;
        }
        .client-item ul {
          list-style-type: none;
          padding: 0;
          margin: 10px 0;
        }
        .client-item ul li {
          background: #e9ecef;
          padding: 5px;
          margin-bottom: 5px;
          border-radius: 5px;
        }
        @media (max-width: 768px) {
          .navbar {
            // flex-direction: column;
          }
          .navbar button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}