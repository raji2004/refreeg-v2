import { useRef } from "react";
import { render, fireEvent } from "@testing-library/react";
import { useOutsideClick } from "@/hooks/use-outside-click";

function TestHarness({ onOutsideClick }: { onOutsideClick: jest.Mock }) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, onOutsideClick);

  return (
    <div>
      <div ref={ref} data-testid="inside">
        Inside
      </div>
      <div data-testid="outside">Outside</div>
    </div>
  );
}

describe("useOutsideClick", () => {
  it("calls callback when mousedown occurs outside the ref element", () => {
    const onOutsideClick = jest.fn();
    render(<TestHarness onOutsideClick={onOutsideClick} />);

    fireEvent.mouseDown(document.querySelector('[data-testid="outside"]')!);

    expect(onOutsideClick).toHaveBeenCalledTimes(1);
  });

  it("does not call callback when mousedown occurs inside the ref element", () => {
    const onOutsideClick = jest.fn();
    render(<TestHarness onOutsideClick={onOutsideClick} />);

    fireEvent.mouseDown(document.querySelector('[data-testid="inside"]')!);

    expect(onOutsideClick).not.toHaveBeenCalled();
  });
});
