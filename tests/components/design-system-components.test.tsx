import React from "react"
import { render, screen } from "@testing-library/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { CalloutBanner } from "@/components/ui/callout-banner"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MultiSelectBar } from "@/components/ui/multi-select-bar"

describe("Design System Components", () => {
  describe("Button variants", () => {
    it("renders fintech button variants correctly", () => {
      render(
        <div>
          <Button variant="lime">Lime CTA</Button>
          <Button variant="ink">Ink Action</Button>
          <Button variant="forest">Forest Trust</Button>
          <Button variant="rust">Rust Delete</Button>
          <Button variant="surface">Surface Button</Button>
          <Button variant="subtle">Subtle Button</Button>
        </div>
      )
      expect(screen.getByText("Lime CTA")).toBeInTheDocument()
      expect(screen.getByText("Ink Action")).toBeInTheDocument()
      expect(screen.getByText("Forest Trust")).toBeInTheDocument()
      expect(screen.getByText("Rust Delete")).toBeInTheDocument()
      expect(screen.getByText("Surface Button")).toBeInTheDocument()
      expect(screen.getByText("Subtle Button")).toBeInTheDocument()
    })
  })

  describe("Badge variants", () => {
    it("renders design system status chip variants", () => {
      render(
        <div>
          <Badge variant="live">LIVE</Badge>
          <Badge variant="cleared">CLEARED</Badge>
          <Badge variant="pending">PENDING</Badge>
          <Badge variant="critical">CRITICAL</Badge>
          <Badge variant="forest">FOREST</Badge>
          <Badge variant="cyan">CYAN</Badge>
          <Badge variant="blue">BLUE</Badge>
          <Badge variant="verified">VERIFIED</Badge>
        </div>
      )
      expect(screen.getByText("LIVE")).toBeInTheDocument()
      expect(screen.getByText("CLEARED")).toBeInTheDocument()
      expect(screen.getByText("PENDING")).toBeInTheDocument()
      expect(screen.getByText("CRITICAL")).toBeInTheDocument()
      expect(screen.getByText("FOREST")).toBeInTheDocument()
      expect(screen.getByText("CYAN")).toBeInTheDocument()
      expect(screen.getByText("BLUE")).toBeInTheDocument()
      expect(screen.getByText("VERIFIED")).toBeInTheDocument()
    })
  })

  describe("Card variants", () => {
    it("renders new container variants", () => {
      render(
        <div>
          <Card variant="outlined" data-testid="card-outlined">Outlined Card</Card>
          <Card variant="ink" data-testid="card-ink">Ink Card</Card>
          <Card variant="forest" data-testid="card-forest">Forest Card</Card>
          <Card variant="sand" data-testid="card-sand">Sand Card</Card>
          <Card variant="surface" data-testid="card-surface">Surface Card</Card>
        </div>
      )
      expect(screen.getByTestId("card-outlined")).toHaveClass("border-2")
      expect(screen.getByTestId("card-ink")).toHaveClass("bg-ink")
      expect(screen.getByTestId("card-forest")).toHaveClass("bg-forest")
      expect(screen.getByTestId("card-sand")).toHaveClass("bg-sand/30")
      expect(screen.getByTestId("card-surface")).toHaveClass("bg-surface")
    })
  })

  describe("CalloutBanner variants", () => {
    it("renders banner variants", () => {
      render(
        <div>
          <CalloutBanner variant="rust" title="Critical Issue" description="Fix mismatch" />
          <CalloutBanner variant="forest" title="Verified Success" />
          <CalloutBanner variant="sand" title="Waiting Notice" />
        </div>
      )
      expect(screen.getByText("Critical Issue")).toBeInTheDocument()
      expect(screen.getByText("Verified Success")).toBeInTheDocument()
      expect(screen.getByText("Waiting Notice")).toBeInTheDocument()
    })
  })

  describe("Switch variants", () => {
    it("renders switch properly", () => {
      render(<Switch data-testid="switch" defaultChecked />)
      expect(screen.getByTestId("switch")).toBeInTheDocument()
    })
  })

  describe("Progress variants", () => {
    it("renders progress with color variant", () => {
      render(<Progress value={50} indicatorVariant="cyan" data-testid="progress" />)
      expect(screen.getByTestId("progress")).toBeInTheDocument()
    })
  })

  describe("Tabs pill variant", () => {
    it("renders pill tabs correctly", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList variant="pill">
            <TabsTrigger value="tab1" variant="pill">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      )
      expect(screen.getByText("Tab 1")).toBeInTheDocument()
    })
  })

  describe("MultiSelectBar", () => {
    it("renders when selectedCount > 0 and hides when 0", () => {
      const { rerender } = render(
        <MultiSelectBar selectedCount={3} actions={<button>Batch Delete</button>} />
      )
      expect(screen.getByText("3 items selected")).toBeInTheDocument()
      expect(screen.getByText("Batch Delete")).toBeInTheDocument()

      rerender(<MultiSelectBar selectedCount={0} />)
      expect(screen.queryByText("items selected")).not.toBeInTheDocument()
    })
  })
})
