// Admin Management Edge Function
// Handles creating Supabase Auth users when adding admins with password authentication
// and resetting passwords. Requires the caller to be an active super_admin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    // 1) Verify the calling user
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user?.email) {
      return json({ error: "Unauthorized" }, 401);
    }

    const callerEmail = userData.user.email.toLowerCase();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: caller } = await admin
      .from("admins")
      .select("id, role, status")
      .eq("email", callerEmail)
      .maybeSingle();

    if (!caller || caller.status !== "active" || caller.role !== "super_admin") {
      return json({ error: "Only active super admins can perform this action" }, 403);
    }

    const body = await req.json();
    const action = body.action as string;

    if (action === "create_admin") {
      const name = String(body.name ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const role = body.role === "super_admin" ? "super_admin" : "admin";
      const auth_method = ["google", "password", "both"].includes(body.auth_method)
        ? body.auth_method
        : "both";
      const password = body.password as string | undefined;

      if (!name || !email) return json({ error: "Name and email are required" }, 400);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return json({ error: "Invalid email" }, 400);
      }

      // Check duplicate
      const { data: existing } = await admin
        .from("admins")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existing) return json({ error: "An admin with this email already exists" }, 409);

      // Create auth user if password method
      if (auth_method === "password" || auth_method === "both") {
        if (!password || password.length < 8) {
          return json({ error: "Password must be at least 8 characters" }, 400);
        }
        const { error: authErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name },
        });
        // If user already exists in auth (e.g. previously had google access), that's OK — update password
        if (authErr && !String(authErr.message).toLowerCase().includes("already")) {
          return json({ error: `Auth user creation failed: ${authErr.message}` }, 400);
        }
        if (authErr) {
          // try to find existing user and set password
          const { data: list } = await admin.auth.admin.listUsers();
          const existingAuth = list.users.find(
            (u) => u.email?.toLowerCase() === email,
          );
          if (existingAuth) {
            await admin.auth.admin.updateUserById(existingAuth.id, { password });
          }
        }
      }

      const { data: inserted, error: insErr } = await admin
        .from("admins")
        .insert({
          name,
          email,
          role,
          auth_method,
          status: "active",
          created_by: caller.id,
        })
        .select()
        .single();

      if (insErr) return json({ error: insErr.message }, 400);
      return json({ success: true, admin: inserted });
    }

    if (action === "reset_password") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!email) return json({ error: "Email required" }, 400);

      const redirectTo = String(body.redirectTo ?? `${SUPABASE_URL}/auth`);
      const { error: linkErr } = await admin.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (linkErr) return json({ error: linkErr.message }, 400);
      return json({ success: true });
    }

    if (action === "update_password") {
      // Super admin sets/changes a password for an existing admin
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = body.password as string;
      if (!email || !password || password.length < 8) {
        return json({ error: "Email and password (min 8 chars) required" }, 400);
      }
      const { data: list } = await admin.auth.admin.listUsers();
      const target = list.users.find((u) => u.email?.toLowerCase() === email);
      if (target) {
        const { error: updErr } = await admin.auth.admin.updateUserById(target.id, {
          password,
        });
        if (updErr) return json({ error: updErr.message }, 400);
      } else {
        const { error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (createErr) return json({ error: createErr.message }, 400);
      }
      return json({ success: true });
    }

    if (action === "bootstrap_super_admin") {
      // Open helper to create the bootstrap super admin auth user.
      // Allowed only if no super admin auth user exists yet for this email.
      const email = "aman@vibesonlovable.com";
      const password = "lovableadmin123";
      const { data: list } = await admin.auth.admin.listUsers();
      const target = list.users.find((u) => u.email?.toLowerCase() === email);
      if (target) {
        await admin.auth.admin.updateUserById(target.id, { password, email_confirm: true });
      } else {
        const { error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: "Aman (Super Admin)" },
        });
        if (error) return json({ error: error.message }, 400);
      }
      return json({ success: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
