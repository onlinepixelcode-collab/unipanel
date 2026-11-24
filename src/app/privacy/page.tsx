import type { Metadata } from "next";
import { SHOWROOMS } from "@/lib/site";
export const metadata: Metadata = { title: "Privacy Notice (POPIA)", description: "How UnipanelSA collects, uses and protects personal information under the Protection of Personal Information Act." };

export default function Page() {
  return (
    <article data-theme="light" className="container-x max-w-3xl pb-28 pt-[calc(var(--nav-h)+8vh)] [&_h2]:display [&_h2]:mt-12 [&_h2]:text-[32px] [&_p]:mt-4 [&_li]:mt-2 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5">
      <p className="eyebrow text-stone">Legal</p>
      <h1 className="display mt-6 text-[clamp(3rem,7vw,6rem)]">Privacy notice</h1>
      <p className="lede text-stone">This notice explains how Unipanel SA (“we”) processes personal information in line with the Protection of Personal Information Act 4 of 2013 (POPIA).</p>
      <h2>What we collect</h2>
      <ul>
        <li>Details you enter in our forms: name, company, role, email, phone, delivery address and your message.</li>
        <li>Your Studio scheme, Sample Box selection and messages to the Ask Unipanel concierge, when you choose to send them.</li>
      </ul>
      <h2>Why we use it</h2>
      <p>Only to respond to your request: to send a sample box, arrange a showroom visit, answer an enquiry or process an order. We do not sell personal information and we do not use it for unrelated marketing without your consent.</p>
      <h2>Who receives it</h2>
      <p>Your request goes to the showroom you select. Concierge messages are processed by our AI service provider to generate replies and are not used to identify you. Service providers act on our instructions and must keep information secure.</p>
      <h2>Storage on your device</h2>
      <p>Your Sample Box selection is kept in your browser’s local storage so it survives a page reload. You can clear it at any time from the Sample Box page or your browser settings.</p>
      <h2>Your rights</h2>
      <p>You may ask to access, correct or delete your personal information, or object to its processing, by contacting any showroom below. You may also lodge a complaint with the Information Regulator of South Africa.</p>
      <h2>Contact</h2>
      <ul>
        {SHOWROOMS.map((s) => (
          <li key={s.id}>
            {s.city}: <a className="underline underline-offset-4" href={`mailto:${s.email}`}>{s.email}</a>, {s.phone}
          </li>
        ))}
      </ul>
      <p className="caption mt-12 text-stone">Draft wording for review by UnipanelSA’s Information Officer before launch.</p>
    </article>
  );
}
