// ... dentro de LoginPage() ...
const [availableGroups, setAvailableGroups] = useState<{name: string}[]>([]);

useEffect(() => {
  const loadGroups = async () => {
    const { data } = await supabase.from("groups").select("name").order("name");
    if (data && data.length > 0) {
      setAvailableGroups(data);
      setGroupName(data[0].name); // Selecciona el primero por defecto
    }
  };
  loadGroups();
}, []);

// ... y en el HTML del select ...
<select 
  value={groupName} onChange={(e) => setGroupName(e.target.value)}
  style={{ padding: "12px", borderRadius: "5px", border: "1px solid #ddd", backgroundColor: "#fff" }}
>
  {availableGroups.length > 0 ? (
    availableGroups.map((g, i) => <option key={i} value={g.name}>{g.name}</option>)
  ) : (
    <option>Cargando clases...</option>
  )}
</select>