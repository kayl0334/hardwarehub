
const supabase = require("../config/supabase");

async function requireAdmin(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Please log in first."
        }
      });
    }

    const token = authorization.slice(7);

    // Verify the Supabase access token
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Your session is invalid or expired."
        }
      });
    }

    // Check the user's role in the database
    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

    if (profileError) {
      console.error("Admin profile lookup failed:", profileError.message);

      return res.status(500).json({
        success: false,
        error: {
          code: "PROFILE_CHECK_FAILED",
          message: "Unable to verify account permissions."
        }
      });
    }

    if (profile?.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Administrator access required."
        }
      });
    }

    req.user = data.user;
    next();
  } catch (error) {
    console.error("Admin authentication error:", error);

    res.status(500).json({
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Unable to verify administrator."
      }
    });
  }
}

module.exports = requireAdmin;
