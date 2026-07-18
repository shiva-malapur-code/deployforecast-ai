import type { ForecastRequest } from '@deploy-forecast/shared';
import { sampleCode } from '@/data/sample-code';

export type DemoCase = {
  id: string;
  label: string;
  title: string;
  description: string;
  code: string;
  language: ForecastRequest['language'];
  scenario: string;
};

export const demoCases: DemoCase[] = [
  {
    id: 'search-traffic',
    label: 'API storm',
    title: 'Search under traffic growth',
    description: 'Unbounded effects, unstable rows, and inaccessible controls compound at scale.',
    code: sampleCode,
    language: 'typescript',
    scenario: 'Traffic grows 10×',
  },
  {
    id: 'catalog-volume',
    label: 'Large catalog',
    title: 'Product list at 100k items',
    description:
      'A full client-side list reveals identity, rendering, typing, and accessibility risk.',
    language: 'typescript',
    scenario: 'The catalog reaches 100k items',
    code: `import { useState } from "react";

type Product = { id: string; name: string; image: string };

export default function ProductCatalog({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState([]);

  return (
    <main>
      <input placeholder="Filter products" />
      {products.map((product) => (
        <div key={Math.random()} onClick={() => setSelected([...selected, product])}>
          <img src={product.image} />
          <span>{product.name}</span>
        </div>
      ))}
    </main>
  );
}`,
  },
  {
    id: 'checkout-dependency',
    label: 'Checkout outage',
    title: 'Checkout with a slow dependency',
    description:
      'Missing recovery behavior and unsafe rendering turn latency into user-facing risk.',
    language: 'javascript',
    scenario: 'The payment API becomes slow or unavailable',
    code: `import { useState } from "react";

export default function Checkout({ confirmationHtml }) {
  const [status, setStatus] = useState("idle");

  function placeOrder() {
    setStatus("submitting");
    fetch("/api/checkout", { method: "POST" })
      .then((response) => response.json())
      .then(() => setStatus("complete"));
  }

  return (
    <section>
      <div onClick={placeOrder}>Place order</div>
      <div dangerouslySetInnerHTML={{ __html: confirmationHtml }} />
      <p>{status}</p>
    </section>
  );
}`,
  },
];
