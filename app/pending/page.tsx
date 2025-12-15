

export default function PendingApprovalPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            marginBottom: "0.75rem",
          }}
        >
          Application under review
        </h1>

        <p
          style={{
            fontSize: "0.95rem",
            color: "#555",
            lineHeight: 1.6,
          }}
        >
          Your account has been created successfully, but it is not active yet.
          An administrator must approve your application before you can start
          using the app.
        </p>

        <p
          style={{
            fontSize: "0.85rem",
            color: "#777",
            marginTop: "1.25rem",
          }}
        >
          You will be notified once your account is approved.
        </p>
      </div>
    </main>
  );
}