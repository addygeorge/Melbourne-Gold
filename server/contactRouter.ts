/**
 * contactRouter — handles the enquiry form submission.
 * Sends an email to johnstylianou1952@gmail.com via SMTP.
 *
 * In production set these env vars (via webdev_request_secrets):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *
 * If those are absent the email is logged to the console (dev fallback).
 */

import nodemailer from "nodemailer";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";

const RECIPIENT = "johnstylianou1952@gmail.com";

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: { user, pass },
    });
  }

  // Fallback: use Gmail SMTP directly if SMTP_USER is a Gmail address
  if (user?.endsWith("@gmail.com") && pass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  // Dev fallback — log to console
  return null;
}

export const contactRouter = router({
  sendEnquiry: publicProcedure
    .input(
      z.object({
        name:    z.string().min(1, "Name is required"),
        phone:   z.string().optional(),
        email:   z.string().email("Valid email required"),
        message: z.string().min(1, "Message is required"),
      })
    )
    .mutation(async ({ input }) => {
      const { name, phone, email, message } = input;

      const subject = `New Enquiry from ${name} — Gold Buyers Melbourne`;
      const text = [
        `Name:    ${name}`,
        `Email:   ${email}`,
        `Phone:   ${phone ?? "—"}`,
        ``,
        `Message:`,
        message,
      ].join("\n");

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px">
          <h2 style="color:#c9a227">New Enquiry — Gold Buyers Melbourne</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;font-weight:bold;width:80px">Name</td><td>${name}</td></tr>
            <tr><td style="padding:6px 0;font-weight:bold">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:6px 0;font-weight:bold">Phone</td><td>${phone ?? "—"}</td></tr>
          </table>
          <hr style="margin:16px 0;border-color:#c9a227"/>
          <p style="font-weight:bold">Message:</p>
          <p style="white-space:pre-wrap">${message}</p>
        </div>
      `;

      const transport = buildTransport();

      if (!transport) {
        // Dev fallback — print to server console
        console.log("\n📧 [CONTACT FORM — no SMTP configured, logging only]");
        console.log(text);
        console.log("─".repeat(60));
        return { success: true, method: "logged" as const };
      }

      await transport.sendMail({
        from:    process.env.SMTP_USER ?? RECIPIENT,
        to:      RECIPIENT,
        replyTo: email,
        subject,
        text,
        html,
      });

      return { success: true, method: "email" as const };
    }),
});
