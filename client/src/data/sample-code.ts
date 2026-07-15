export const sampleCode = `import { useEffect, useState } from "react";

export default function UserSearch() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(\`/api/users?q=\${query}\`)
      .then((response) => response.json())
      .then((data) => setUsers(data));
  });

  return (
    <section>
      <div onClick={() => setQuery("")}>Clear search</div>
      <input value={query} onChange={(event) => setQuery(event.target.value)} />

      {users.map((user) => (
        <div key={Math.random()}>
          <img src={user.avatar} />
          <span>{user.name}</span>
        </div>
      ))}
    </section>
  );
}`;
