import React from 'react';
import TicketStubFooter from '../components/ui/ticket-stub-footer';

export const Footer: React.FC = () => {
  return (
    <footer id="footer" className="w-full bg-[#0e1015] border-t border-white/10">
      <TicketStubFooter
        brand="Hack for Good"
        wordmark="Hack for Good"
        company="Hack for Good Foundation"
        year={2026}
        eyebrow={[
          "Global Student & Builder Hackathon",
          "Building technology for humanitarian impact",
          "Applications open worldwide \u00b7 2026 Edition",
        ]}
        headline={["Build for good.", "Trigger real impact."]}
        description="Connect with visionary mentors, push open-source forward, and architect scalable solutions for communities that need them most."
        cta={{ label: "Register now", href: "#cta" }}
        sections={[
          { label: "Home", href: "#" },
          { label: "About", href: "#about" },
          { label: "Tracks", href: "#tracks" },
          { label: "Timeline", href: "#timeline" },
          { label: "Prizes", href: "#prizes" },
          { label: "Partners", href: "/partners" },
          { label: "Register", href: "#cta" },
        ]}
        linkGroups={[
          {
            title: "Navigation",
            links: [
              { label: "About", href: "#about" },
              { label: "Tracks", href: "#tracks" },
              { label: "Timeline", href: "#timeline" },
              { label: "Prizes", href: "#prizes" },
              { label: "Partners", href: "/partners" },
              { label: "Register", href: "#cta" },
            ],
          },
          {
            title: "Community",
            links: [
              { label: "Discord", href: "https://discord.com" },
              { label: "GitHub", href: "https://github.com" },
              { label: "X / Twitter", href: "https://twitter.com" },
              { label: "LinkedIn", href: "https://linkedin.com" },
              { label: "Email Support", href: "mailto:team@hackforgood.org" },
            ],
          },
        ]}
        statusLabels={["Live", "Standby"]}
        statusCaption="Hackathon Status"
        defaultActive={true}
        showCount={false}
        rate={1.4}
        blurb="Hack for Good is a student-led hackathon hosted by Nexus, created to bring together the brightest ideas and emerging talent from our college community. It is a space to collaborate, experiment, and build solutions that turn bold thinking into real-world impact."
        legal={[
          { label: "All rights reserved" },
          { label: "Code of Conduct", href: "#" },
          { label: "Privacy Policy", href: "#" },
        ]}
        background="#0e1015"
        ink="#F1EEE7"
        muted="#8E908D"
        accent="#D97745"
        accentDeep="#bf5f2f"
        accentInk="#0e1015"
        halftone={true}
      />
    </footer>
  );
};
