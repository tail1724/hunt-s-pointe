import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Help from "@/pages/Help";

// Help now links out (guide cards, sidebar) via react-router <Link>, so it
// needs a router in the tree.
const renderHelp = () => render(<Help />, { wrapper: MemoryRouter });

describe("Help page", () => {
  it("renders all module sections with real guide content", () => {
    renderHelp();
    expect(screen.getByText("Field guides for every room in the study")).toBeInTheDocument();
    for (const label of ["Getting started", "Ezra", "Write", "Collections", "File Cabinet", "Analytics", "Integrations"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    // No placeholder copy anywhere.
    expect(screen.queryByText(/lorem ipsum/i)).not.toBeInTheDocument();
  });

  it("search filters guides down to matches", () => {
    renderHelp();
    const input = screen.getByLabelText("Search help guides");
    fireEvent.change(input, { target: { value: "citations" } });
    expect(screen.getByText("Grounding answers in your own library")).toBeInTheDocument();
    expect(screen.queryByText("Focus mode")).not.toBeInTheDocument();
  });

  it("shows an empty state for a query with no matches", () => {
    renderHelp();
    const input = screen.getByLabelText("Search help guides");
    fireEvent.change(input, { target: { value: "zzzz-no-match" } });
    expect(screen.getByText(/Nothing matched/)).toBeInTheDocument();
  });
});
