import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";

export function AuthTestimonials() {
  const testimonials = [
    {
      quote:
        "RefreeG is easily one of the most thoughtful platforms I’ve used. Everything feels intuitive, transparent, and built with real people in mind.",
      name: "JULIUS (Adeiza) ANGULU",
      designation: "CEO, RefreeG",
      src: "/auth/julius.jpg",
    },
    {
      quote:
        "RefreeG stands out for its clarity and trust. You instantly feel safe crowdfunding with it.",
      name: "Chukwunomso Amadike-Unaogu",
      designation: "CPO, Refreeg",
      src: "/auth/nomso.jpg",
    },
    {
      quote:
        "There’s something refreshing about RefreeG — it feels genuine. The design is clean, the experience smooth, and the mission inspiring.",
      name: "Fedjost Ayomide",
      designation: "VP Engineering, RefreeG",
      src: "/auth/tyrone.jpg",
    },

    {
      quote:
        "Every detail of RefreeG feels intentional — from the onboarding to the dashboard. It’s the kind of platform you instantly trust.",
      name: "Quadri Hassan",
      designation: "Co-CPO",
      src: "/auth/hassan.jpg",
    },
    {
      quote:
        "What sets RefreeG apart is the heart behind it. It’s more than a platform — it’s a movement built on trust, empathy, and innovation.",
      name: "Oghenetega (Victor) Gbiyede",
      designation: "Frontend Developer",
      src: "/auth/tega.jpg",
    },
  ];

  return <AnimatedTestimonials testimonials={testimonials} />;
}
