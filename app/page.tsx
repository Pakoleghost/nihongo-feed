export default function Home() {
  return (
    <main style={styles.page}>
      <div style={styles.phone}>
        {/* Header */}
        <header style={styles.header}>
          Nihongo Feed
        </header>

        {/* Feed */}
        <div style={styles.feed}>
          <Post
            user="ユーザー"
            text="Primer post de prueba 🇯🇵"
          />
          <Post
            user="ユーザー"
            text="Segundo post de prueba ✨"
          />
        </div>
      </div>
    </main>
  );
}

function Post({ user, text }: { user: string; text: string }) {
  return (
    <div style={styles.post}>
      <div style={styles.postHeader}>
        <div style={styles.avatar}>ユ</div>
        <span style={styles.username}>{user}</span>
      </div>

      <div style={styles.postBody}>
        {text}
      </div>

      <div style={styles.actions}>
        ❤️&nbsp;&nbsp;💬&nbsp;&nbsp;🔖
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f2f2f2",
    display: "flex",
    justifyContent: "center",
    paddingTop: 32,
  },
  phone: {
    width: 390,
    backgroundColor: "#fff",
    borderRadius: 18,
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    overflow: "hidden",
  },
  header: {
    padding: "16px",
    fontSize: 18,
    fontWeight: 600,
    textAlign: "center",
    borderBottom: "1px solid #e5e5e5",
  },
  feed: {
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  post: {
    border: "1px solid #e5e5e5",
    borderRadius: 14,
    overflow: "hidden",
  },
  postHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderBottom: "1px solid #eee",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    backgroundColor: "#ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
  username: {
    fontSize: 14,
    fontWeight: 600,
  },
  postBody: {
    padding: 12,
    fontSize: 14,
    lineHeight: 1.5,
  },
  actions: {
    padding: "8px 12px",
    borderTop: "1px solid #eee",
    fontSize: 18,
  },
};