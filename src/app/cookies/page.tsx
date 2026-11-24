import type { Metadata } from "next";
export const metadata: Metadata = { title: "Cookies", description: "UnipanelSA’s website uses no tracking cookies. Here is what it stores in your browser and why." };

export default function Page() {
  return (
    <article data-theme="light" className="container-x max-w-3xl pb-28 pt-[calc(var(--nav-h)+8vh)] [&_p]:mt-4">
      <p className="eyebrow text-stone">Legal</p>
      <h1 className="display mt-6 text-[clamp(3rem,7vw,6rem)]">Cookies</h1>
      <p className="lede text-stone">This site sets no advertising or tracking cookies.</p>
      <table className="mt-10 w-full text-left text-[15px]">
        <thead className="eyebrow text-stone">
          <tr>
            <th className="border-b border-hairline py-3">Item</th>
            <th className="border-b border-hairline py-3">Where</th>
            <th className="border-b border-hairline py-3">Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-b border-hairline py-3 font-mono text-[13px]">unipanel-sample-box</td>
            <td className="border-b border-hairline py-3">Local storage</td>
            <td className="border-b border-hairline py-3">Remembers the finishes in your Sample Box.</td>
          </tr>
          <tr>
            <td className="border-b border-hairline py-3 font-mono text-[13px]">up-intro</td>
            <td className="border-b border-hairline py-3">Session storage</td>
            <td className="border-b border-hairline py-3">Shows the intro animation once per visit.</td>
          </tr>
          <tr>
            <td className="border-b border-hairline py-3 font-mono text-[13px]">unipanel-pending</td>
            <td className="border-b border-hairline py-3">Session storage</td>
            <td className="border-b border-hairline py-3">Carries a concierge request into the Studio.</td>
          </tr>
        </tbody>
      </table>
      <p>If analytics are added later, this page will list them and ask for consent first.</p>
    </article>
  );
}
