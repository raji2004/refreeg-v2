import { fireEvent, render, screen } from "@testing-library/react";
import { Stepper, type StepperStep } from "@/components/ui/stepper";

const steps: StepperStep[] = [
  { label: "Basics", status: "done" },
  { label: "Story", status: "current" },
  { label: "Media", status: "upcoming" },
];

describe("Stepper", () => {
  it("lets completed steps be selected by their 1-based number", () => {
    const onStepSelect = jest.fn();
    render(<Stepper steps={steps} onStepSelect={onStepSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Go back to Basics" }));

    expect(onStepSelect).toHaveBeenCalledWith(1);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("marks the current step and renders no buttons without a handler", () => {
    render(<Stepper steps={steps} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Story").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
  });
});
