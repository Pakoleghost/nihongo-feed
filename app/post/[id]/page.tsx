{/* Busca la parte donde está el nombre del autor y cámbiala por esto: */}
<Link href={`/profile/${post.user_id}`} style={{ textDecoration: "none", color: "inherit", fontWeight: "bold" }}>
  {post.profiles?.is_admin ? "👨‍🏫 Sensei" : post.profiles?.username}
</Link>