import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "../utils/toast";
import { Api } from "../api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [valid, setValid] = useState(null);
  const [emailMasked, setEmailMasked] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setValid(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Api.auth
      .validatePasswordResetLink(token)
      .then((res) => {
        if (cancelled) return;
        setValid(res.data?.valid === true);
        setEmailMasked(res.data?.email_masked || "");
      })
      .catch(() => {
        if (cancelled) return;
        setValid(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !password || password !== confirmPassword) {
      if (password !== confirmPassword) toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitLoading(true);
    try {
      await Api.auth.resetPasswordWithLink({
        token,
        new_password: password,
        confirm_password: confirmPassword,
      });
      setDone(true);
      toast.success("Password reset. You can now log in.");
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        "Invalid or expired link. Request a new one from the login page.";
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!token || valid === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid or expired link
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            This link may have expired or already been used. Go to the login page and use
            &quot;Forgot password?&quot; to request a new link.
          </p>
          <Link
            to="/Login"
            className="inline-block px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Password reset successful
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            You can now log in with your new password.
          </p>
          <Link
            to="/Login"
            className="inline-block px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 max-w-md w-full">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Set new password
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Enter your new password below. Link expires in 7 days.
        </p>
        {emailMasked && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Account: <span className="font-medium text-gray-700 dark:text-gray-300">{emailMasked}</span>
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={submitLoading || password.length < 6 || password !== confirmPassword}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitLoading ? "Resetting…" : "Reset password"}
          </button>
        </form>
        <p className="mt-4 text-center">
          <Link to="/Login" className="text-sm text-primary hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
