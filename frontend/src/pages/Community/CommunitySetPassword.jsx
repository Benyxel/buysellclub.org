import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "../../utils/toast";
import { Api } from "../../api";

const CommunitySetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [valid, setValid] = useState(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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
    Api.community
      .setPasswordValidate(token)
      .then((res) => {
        if (cancelled) return;
        setValid(res.data?.valid === true);
        setEmail(res.data?.email || "");
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
    if (!token || !username.trim() || !password || password !== confirmPassword) {
      if (password !== confirmPassword) toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitLoading(true);
    try {
      await Api.community.setPasswordSubmit({
        token,
        username: username.trim(),
        password,
        confirm_password: confirmPassword,
      });
      setDone(true);
      toast.success("Account created. You can now log in.");
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.username?.[0] ||
        "Failed to set password.";
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
            This link may have expired or already been used. Request a new one from the community
            payment flow or contact support.
          </p>
          <Link
            to="/Community"
            className="inline-block px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90"
          >
            Back to Community
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
            You’re all set
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Your username and password are set. You can now log in to access the community.
          </p>
          <Link
            to="/Login"
            className="inline-block px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 max-w-md w-full">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Create your login
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Your community payment was successful. Set a username and password to access the community.
        </p>
        {email && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Email: <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username (max 10 characters)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.slice(0, 10))}
              maxLength={10}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
              placeholder="Choose a username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password (min 6 characters)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
              placeholder="Password"
              required
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
              placeholder="Confirm password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitLoading || !username.trim() || password.length < 6 || password !== confirmPassword}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitLoading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center">
          <Link to="/Login" className="text-sm text-primary hover:underline">
            Already have an account? Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default CommunitySetPassword;
