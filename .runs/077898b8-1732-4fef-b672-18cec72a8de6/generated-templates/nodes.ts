// AUTO-GENERATED — nodes.ts
export type Node = {
  id: string;
  tool: string;
  inputs: Record<string, any>;
  condition?: string;
  outputs?: string[];
};

export const nodes: Node[] = [
  {
    "id": "step-1",
    "tool": "amc.createlookalike",
    "inputs": {
      "seed_audience": "$seed_audience_id",
      "lookalike_size": 1
    },
    "condition": "",
    "outputs": [
      "lookalike_audience_id"
    ]
  }
];
