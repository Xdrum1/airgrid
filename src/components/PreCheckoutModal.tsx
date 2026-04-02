"use client";

import { useState, useEffect } from "react";
import { isConsumerEmail } from "@/lib/consumer-email";

const USE_CASES = [
  "City Planning",
  "Infrastructure Development",
  "eVTOL Operations",
  "Investment / Finance",
  "Research",
  "Government / Federal",
  "Other",
];

interface PreCheckoutModalProps {
  tier: string;
  interval: string;
  userEmail: string;
  onSubmit: (data: { organization: string; jobTitle: string }) => void;
  onCancel: () => void;
}

export default function PreCheckoutModal({
  tier,
  interval,
  userEmail,
  onSubmit,
  onCancel,
}: PreCheckoutModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organization, setOrganization] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [useCase, setUseCase] = useState("");
  const [saving, setSaving] = useState(false);
  const [isConsumer, setIsConsumer] = useState(false);

  useEffect(() => {
    if (userEmail) {
      setIsConsumer(isConsumerEmail(userEmail));
    }
  }, [userEmail]);

  // Load existing profile data
  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.firstName) setFirstName(data.firstName);
        if (data.lastName) setLastName(data.lastName);
        if (data.organization) setOrganization(data.organization);
        if (data.jobTitle) setJobTitle(data.jobTitle);
      })
      .catch(() => {});
  }, []);

  const isInstitutional = tier === "institutional";
  const canSubmit =
    firstName.trim() && lastName.trim() && organization.trim() && jobTitle.trim();

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          organization: organization.trim(),
          jobTitle: jobTitle.trim(),
        }),
      });
      onSubmit({ organization: organization.trim(), jobTitle: jobTitle.trim() });
    } catch {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    color: "#ddd",
    fontSize: 13,
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    color: "#777",
    marginBottom: 4,
    fontFamily: "'Inter', sans-serif",
    letterSpacing: "0.02em",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(5,5,8,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#0a0a12",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: "36px 32px 28px",
          maxWidth: 440,
          width: "100%",
          margin: "0 16px",
        }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: "#fff",
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          Complete your profile
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#888",
            marginBottom: 24,
            textAlign: "center",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Required before subscribing to{" "}
          <span style={{ color: "#5B8DB8" }}>
            {tier === "institutional" ? "Institutional" : "Professional"}
          </span>
          {" "}({interval}).
        </div>

        {isConsumer && (
          <div
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: 6,
              padding: "10px 12px",
              fontSize: 11,
              color: "#f59e0b",
              lineHeight: 1.6,
              marginBottom: 16,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Please use your organization email. Using a personal email? Enter your organization name below.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>First name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={100}
                style={inputStyle}
                placeholder="Jane"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Last name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={100}
                style={inputStyle}
                placeholder="Smith"
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Organization *</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              maxLength={200}
              style={inputStyle}
              placeholder="Acme Aviation"
            />
          </div>

          <div>
            <label style={labelStyle}>Job title *</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              maxLength={200}
              style={inputStyle}
              placeholder="Director of Strategy"
            />
          </div>

          {isInstitutional && (
            <div>
              <label style={labelStyle}>Primary use case</label>
              <select
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                }}
              >
                <option value="" style={{ background: "#0a0a12" }}>
                  Select...
                </option>
                {USE_CASES.map((uc) => (
                  <option key={uc} value={uc} style={{ background: "#0a0a12" }}>
                    {uc}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "12px 0",
              background: "none",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              color: "#666",
              fontSize: 11,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            style={{
              flex: 2,
              padding: "12px 0",
              background: canSubmit
                ? "linear-gradient(135deg, #5B8DB8, #7c3aed)"
                : "#1a1a2e",
              border: "none",
              borderRadius: 6,
              color: canSubmit ? "#000" : "#555",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.06em",
              cursor: canSubmit ? "pointer" : "default",
              transition: "all 0.15s",
            }}
          >
            {saving ? "SAVING..." : "CONTINUE TO CHECKOUT"}
          </button>
        </div>
      </div>
    </div>
  );
}
