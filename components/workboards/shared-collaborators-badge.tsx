"use client";

import { useState } from "react";
import { useEditor, useValue, type TLComponents } from "tldraw";

type Person = { id: string; name: string; color: string };

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "?";
}

function CollaboratorsOverlay() {
  const editor = useEditor();
  const [hovered, setHovered] = useState(false);
  const collaborators = useValue("shared collaborators", () => editor.getCollaborators(), [editor]);
  const currentName = useValue("current user name", () => editor.user.getName() || "Moi", [editor]);
  const currentColor = useValue("current user color", () => editor.user.getColor(), [editor]);

  if (collaborators.length === 0) return null;

  const people: Person[] = [
    { id: "current-user", name: currentName, color: currentColor },
    ...collaborators.map((person) => ({
      id: person.userId,
      name: person.userName || "Participant",
      color: person.color,
    })),
  ];
  const maxVisible = 3;
  const maxExpanded = 5;
  const visiblePeople = people.slice(0, maxExpanded);
  const overflow = Math.max(0, people.length - maxExpanded);
  const slots = overflow > 0 ? [...visiblePeople, null] : visiblePeople;
  const collapsedCount = Math.min(maxVisible, slots.length);
  const avatarSize = 38;
  const peek = 14;
  const gap = 9;
  const collapsedWidth = avatarSize + Math.max(0, collapsedCount - 1) * peek;
  const expandedWidth = slots.length * avatarSize + Math.max(0, slots.length - 1) * gap;
  const width = hovered ? expandedWidth : collapsedWidth;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovered(false);
      }}
      className="pointer-events-auto absolute bottom-5 right-5 z-[1000] flex h-[54px] select-none items-center gap-3 rounded-full border border-white/10 bg-[#202321]/95 px-2.5 shadow-[0_8px_30px_rgba(0,0,0,.32)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_12px_36px_rgba(0,0,0,.42)]"
      style={{ width: "max-content", minWidth: width + 20 }}
      aria-label={`${people.length} personnes connectées`}
    >
      <div className="relative h-[42px] shrink-0" style={{ width, transition: "width 420ms cubic-bezier(.2,.8,.2,1)" }}>
        {slots.map((person, index) => {
          const hiddenWhenCollapsed = index >= maxVisible;
          const expandedX = index * (avatarSize + gap);
          const collapsedX = Math.min(index, maxVisible - 1) * peek;
          const x = hovered ? expandedX : collapsedX;
          const rotation = hovered ? (index % 2 === 0 ? -3 : 3) : [-10, -4, 5, -7, 4][index % 5];
          const isOverflow = person === null;
          return (
            <div
              key={person?.id ?? "overflow"}
              title={isOverflow ? `${overflow} autres participants` : person?.name}
              className="absolute left-0 top-0 grid size-[38px] place-items-center overflow-hidden rounded-full border-[2.5px] border-[#202321] text-[11px] font-bold text-[#171917] shadow-[0_3px_9px_rgba(0,0,0,.3)]"
              style={{
                zIndex: hovered ? index + 1 : slots.length - index,
                background: isOverflow ? "#D5D9D3" : person?.color ?? "#B5CEA5",
                color: isOverflow ? "#303630" : "#171917",
                transform: `translate(${x}px, ${hovered && index % 2 === 0 ? -2 : 0}px) rotate(${rotation}deg) scale(${hiddenWhenCollapsed && !hovered ? 0.55 : 1})`,
                opacity: hiddenWhenCollapsed && !hovered ? 0 : 1,
                transition: "transform 420ms cubic-bezier(.2,.8,.2,1), opacity 220ms ease",
              }}
            >
              {isOverflow ? `+${overflow}` : initials(person?.name ?? "")}
            </div>
          );
        })}
      </div>
      <span className="whitespace-nowrap pr-1 text-[11px] font-medium text-white/75">
        {people.length} en ligne
      </span>
    </div>
  );
}

export const sharedCollaboratorsComponents: TLComponents = {
  PeopleMenuFacePile: null,
  InFrontOfTheCanvas: CollaboratorsOverlay,
};
