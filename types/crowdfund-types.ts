export type UseCaseIdea = {
  title: string;
  description: string;
};

export type ExampleMilestone = {
  label: string;
  amount: number;
  released: boolean;
};

export type UseCase = {
  id: string;
  categoryId: string;
  label: string;
  heading: string;
  /** Italic accent word that ends the heading, as on the home page. */
  emphasis: string;
  summary: string;
  cta: string;
  image?: { src: string; alt: string };
  example: {
    title: string;
    location: string;
    goal: number;
    raised: number;
    milestones: ExampleMilestone[];
  };
  ideas: UseCaseIdea[];
};
