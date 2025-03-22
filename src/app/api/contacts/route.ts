import fs from "fs";
import path from "path";

const filePath = path.join(__dirname, "../../../data/contacts.json");

// Ensure the file and directory exist
const ensureFileExists = () => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]", "utf8");
    }
};

// Save contacts to JSON
const saveContacts = (contacts: any) => {
    ensureFileExists();
    fs.writeFileSync(filePath, JSON.stringify(contacts, null, 2), "utf8");
};

// Fetch all contacts
export const GET = async () => {
    ensureFileExists();
    try {
        const contacts = JSON.parse(fs.readFileSync(filePath, "utf8"));
        return new Response(JSON.stringify(contacts), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Failed to parse contacts.json:", error);
        return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
};

// Clear all contacts
export const DELETE = async () => {
    ensureFileExists();
    try {
      fs.writeFileSync(filePath, "[]", "utf8"); // Overwrite the file with an empty array
      return new Response("Database cleared successfully", { status: 200 });
    } catch (error) {
      console.error("Failed to clear database:", error);
      return new Response("Failed to clear database", { status: 500 });
    }
  };

// Add a new contact
export const POST = async (req: Request) => {
    ensureFileExists();
    try {
        const newContact = await req.json();
        const contacts = JSON.parse(fs.readFileSync(filePath, "utf8"));

        // Check if a contact with the same phone number already exists
        const existingContact = contacts.find((c: any) => c.primaryNumber === newContact.primaryNumber);
        if (existingContact) {
            return new Response(
                JSON.stringify({ error: "A client with this phone number already exists." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Add the new contact
        contacts.push(newContact);
        saveContacts(contacts);
        return new Response(JSON.stringify(newContact), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Failed to process POST request:", error);
        return new Response(
            JSON.stringify({ error: "Failed to process request" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};

// Update a contact's outstanding amount and track history
export const PUT = async (req: Request) => {
    ensureFileExists();
    try {
      const updatedContact = await req.json();
      const contacts = JSON.parse(fs.readFileSync(filePath, "utf8"));
  
      // Find the contact by ID
      const index = contacts.findIndex((c: any) => c.id === updatedContact.id);
      if (index !== -1) {
        const contact = contacts[index];
        const change = updatedContact.totalOutstanding - contact.totalOutstanding;
  
        // Update the totalOutstanding field
        contact.totalOutstanding = updatedContact.totalOutstanding;
  
        // Append the change to the history
        if (!contact.history) {
          contact.history = [];
        }
        contact.history.push({
          change,
          date: new Date().toISOString(),
        });
  
        // Keep only the last 7 transactions in the history
        if (contact.history.length > 7) {
          contact.history = contact.history.slice(-7);
        }
  
        saveContacts(contacts);
        return new Response(JSON.stringify(contact), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response("Contact not found", { status: 404 });
      }
    } catch (error) {
      console.error("Failed to update contact:", error);
      return new Response("Failed to update contact", { status: 500 });
    }
  };