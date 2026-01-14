import bcrypt from "bcryptjs";
import { getDbClient } from "../../config/db.js";
import { BadRequestError } from "../../utils/httpErrors.js";
import { generateNextVendorCode } from "./vendor.repository.js";

export const publicSignup = async (req, res, next) => {
  try {
    const {
      vendorName,
      contactPerson,
      contactEmail,
      contactPhone,
      address,
      gstNumber,
      password,
      confirmPassword,
    } = req.body;

    if (
      !vendorName ||
      !contactPerson ||
      !contactEmail ||
      !password ||
      !confirmPassword
    ) {
      throw new BadRequestError("All required fields must be provided");
    }

    if (password !== confirmPassword) {
      throw new BadRequestError("Passwords do not match");
    }

    if (password.length < 6) {
      throw new BadRequestError("Password must be at least 6 characters long");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      throw new BadRequestError("Invalid email format");
    }

    const db = getDbClient();

    try {
      // Check if email already exists
      const { data: existingUser, error: userCheckError } = await db
        .from("users")
        .select("id")
        .eq("email", contactEmail)
        .maybeSingle();

      if (userCheckError) throw userCheckError;
      if (existingUser) {
        throw new BadRequestError("Email already registered");
      }

      // Generate vendor code (must be non-null per schema)
      const vendorCode = await generateNextVendorCode();

      // Create vendor
      const { data: vendorData, error: vendorError } = await db
        .from("vendors")
        .insert([
          {
            name: vendorName,
            contact_person: contactPerson,
            contact_email: contactEmail,
            contact_phone: contactPhone || null,
            address: address || null,
            gst_number: gstNumber || null,
            status: "ACTIVE",
            is_active: true,
            code: vendorCode,
          },
        ])
        .select("id")
        .single();

      if (vendorError) throw vendorError;

      const vendorId = vendorData.id;
      const passwordHash = await bcrypt.hash(password, 10);

      // Create vendor user
      const { error: userError } = await db.from("users").insert([
        {
          name: contactPerson,
          email: contactEmail,
          password_hash: passwordHash,
          role: "VENDOR",
          vendor_id: vendorId,
          is_active: true,
        },
      ]);

      if (userError) throw userError;

      res.status(201).json({
        message:
          "Vendor signup successful. Your account is pending approval from the admin.",
        success: true,
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    next(error);
  }
};
