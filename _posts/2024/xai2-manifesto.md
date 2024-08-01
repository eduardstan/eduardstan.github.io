---
layout: distill
title: Understanding the Future of Explainable Artificial Intelligence (XAI)
description: A Dive into XAI 2.0
tags: XAI
giscus_comments: true
date: 2024-08-01
featured: true

authors:
  - name: Ionel Eduard Stan
    url: "https://eduardstan.github.io/"
    affiliations:
      name: IVL, DISCo, University of Milano-Bicocca

bibliography: 2018-12-22-distill.bib

# Optionally, you can add a table of contents to your post.
# NOTES:
#   - make sure that TOC names match the actual section names
#     for hyperlinks within the post to work correctly.
#   - we may want to automate TOC generation in the future using
#     jekyll-toc plugin (https://github.com/toshimaru/jekyll-toc).
toc:
  - name: The Human Face of AI
  - name: The Evolution and Urgency of XAI
  - name: Making AI Transparent
    subsections:
      - name: Simplifying Complex Ideas
      - name: An Experiment
  - name: Deeper Analysis
    subsections:
      - name: Strengths and Innovations
      - name: Critical Perspective
      - name: Ethical Considerations and Societal Impact
  - name: Connecting the Dots
  - name: A Call to Curiosity
  - name: Resources for Further Exploration
  - name: Let’s Talk Science
  - name: Conclusion

# Below is an example of injecting additional post-specific styles.
# If you use this post as a template, delete this _styles block.
_styles: >
  .fake-img {
    background: #bbb;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 0px 4px rgba(0, 0, 0, 0.1);
    margin-bottom: 12px;
  }
  .fake-img p {
    font-family: monospace;
    color: white;
    text-align: left;
    margin: 12px 0;
    text-align: center;
    font-size: 16px;
  }
---

## The Human Face of AI

*Imagine being told that a computer algorithm determined whether you qualify for a loan or made a critical decision in your healthcare. It’s unsettling, right?* We naturally want to understand why such decisions were made. This desire for transparency is what drives the field of Explainable Artificial Intelligence (XAI). But as AI systems grow more complex, the challenge of making them understandable grows, too. Enter XAI 2.0, a new wave of research aimed at making AI not just more intelligent but also more comprehensible to humans.

---

## The Evolution and Urgency of XAI

Explainable Artificial Intelligence has become a vital area of research as AI systems increasingly influence critical areas like finance, healthcare, and environmental management. The paper [Explainable Artificial Intelligence (XAI) 2.0: A Manifesto of Open Challenges and Interdisciplinary Research Directions](https://www.sciencedirect.com/science/article/pii/S1566253524000794) by Longo et al. brings together various experts from various fields to address the urgent need for transparency in AI systems. As AI continues to permeate our lives, understanding its decisions is no longer optional---it's essential. The authors highlight 28 open problems in XAI, categorized into nine distinct high-level areas, aiming to synchronize research efforts and propel the field forward.

{% details Click here for a summary of the areas with their open problems %}

The following tables outline the open problems associated with each high-level problem, providing descriptions and possible solutions to address them.

### 1. **Creating explanations for new types of AI**

| **Open Problem** | **Description** | **Possible Solutions** |
|---|---|---|
| **1.1. Creating explanations for generative and large language models** | Generative models and large language models (LLMs) like GPT are complex, high-dimensional, and capable of producing diverse outputs, making it difficult to explain how they arrive at specific outputs. | Develop new XAI techniques tailored for generative models and LLMs. Techniques could include mechanistic interpretability, causal analysis, and visualization of latent spaces to understand learned representations. |
| **1.2. Creating explanations for distributed and collaborative learning** | Distributed and collaborative learning systems, such as federated learning, involve multiple models trained on decentralized data, complicating the generation of coherent, unified explanations. | Create XAI frameworks that generate local explanations at individual nodes and aggregate them for global insights. Use privacy-preserving techniques like Multi-Party Computation (MPC) and differential privacy to protect sensitive data while explaining. |

### 2. **Improving current XAI methods**

| **Open Problem** | **Description** | **Possible Solutions** |
|---|---|---|
| **2.1. Augmenting and improving attribution methods** | Attribution methods like saliency maps are widely used in XAI but suffer from issues such as sensitivity to input perturbations and difficulty in interpretation by non-experts. | Combine attribution methods with other XAI techniques for a more robust explanation. Enhance the methods to reduce sensitivity to input variations and make them more interpretable by including explanations in natural language. |
| **2.2. Augmenting and improving concept-based learning algorithms** | Concept-based learning algorithms explain model predictions in terms of human-understandable concepts, but these methods often struggle with generalization and applicability across domains. | Integrate knowledge graphs and symbolic AI approaches with concept-based methods to enhance generalization. Develop methods to automatically identify and learn new concepts from data, improving the flexibility and applicability of these models. |
| **2.3. Removing artefacts in synthesis-based explanations** | Synthesis-based explanations generate example inputs to illustrate model behavior, but these examples can contain artefacts that obscure the true learned concepts. | Use state-of-the-art generative models like diffusion models to reduce artefacts. Implement comparison mechanisms to evaluate the accuracy of synthesized explanations against known reference inputs. |
| **2.4. Creating robust explanations** | Explanations can be fragile, changing significantly with small input modifications, which undermines their reliability and trustworthiness. | Develop methods to evaluate the robustness of explanations under different conditions. Combine multiple explanation techniques to mitigate weaknesses in individual methods. Explore ante-hoc explainable models that inherently produce robust explanations. |

### 3. **Clarifying the use of concepts in XAI**

| **Open Problem** | **Description** | **Possible Solutions** |
|---|---|---|
| **3.1. Elucidating the main concepts** | There is a lack of consensus on key terms like explainability, interpretability, and transparency in XAI, leading to confusion and inconsistency in research and application. | Standardize terminology by creating a shared glossary or taxonomy of XAI terms. Engage in interdisciplinary discussions to align definitions and ensure they are applied consistently across different domains. |
| **3.2. Clarifying the relationship between XAI and trustworthiness** | The relationship between explainability and trustworthiness is not well understood, which hinders the development of truly trustworthy AI systems. | Conduct interdisciplinary research to explore how XAI contributes to trustworthiness in AI. Develop frameworks that integrate XAI with other trustworthiness criteria, such as fairness and robustness. |
| **3.3. Finding a useful account of understanding** | Understanding in XAI is often assumed rather than explicitly defined, making it difficult to measure and evaluate whether explanations genuinely enhance user comprehension. | Develop a clear conceptual framework for understanding in XAI, drawing from psychology and philosophy. Design empirical studies to test and refine this framework in practical applications. |

### 4. **Evaluating XAI methods and explanations**

| **Open Problem** | **Description** | **Possible Solutions** |
|---|---|---|
| **4.1. Facilitating human evaluation of explanations** | Many XAI methods lack rigorous human evaluation, making it unclear whether they are genuinely useful or comprehensible to end-users. | Develop standardized protocols for user studies that evaluate the effectiveness and comprehensibility of XAI methods. Incorporate insights from HCI, psychology, and social sciences to design these studies. |
| **4.2. Creating an evaluation framework for XAI methods** | There is no universally accepted framework for evaluating XAI methods, leading to inconsistent assessments of their quality and effectiveness. | Develop a comprehensive evaluation framework that includes metrics for fidelity, usability, and trustworthiness. Encourage the adoption of standardized evaluation tools like Quantus across different XAI applications. |
| **4.3. Overcoming limitations of studies with humans** | Human studies in XAI are often limited by sample size, diversity, and reproducibility, which can lead to biased or unreliable conclusions. | Use synthetic data and virtual participants to supplement human studies and increase diversity. Standardize methodologies and statistical analyses to improve the reliability and generalizability of study findings. |

### 5. **Supporting the human-centeredness of explanations**

| **Open Problem** | **Description** | **Possible Solutions** |
|---|---|---|
| **5.1. Creating human-understandable explanations** | Many XAI methods produce explanations that are technically accurate but difficult for non-expert users to understand and use. | Design explanations that are more aligned with human cognitive processes, using natural language and visual aids. Incorporate user feedback to refine and improve the accessibility of explanations. |
| **5.2. Facilitating explainability with concept-based explanations** | Concept-based explanations need to bridge the gap between technical accuracy and human intuition, ensuring that explanations are meaningful and useful. | Integrate symbolic reasoning with concept-based explanations to enhance their interpretability. Develop tools that allow users to explore and understand the concepts underlying model predictions interactively. |
| **5.3. Addressing explanations divorced from reality** | Explanations that are technically correct but do not reflect real-world causality or logic can be misleading and reduce trust in AI systems. | Ensure that explanations are grounded in real-world logic and causality by validating them against known outcomes and expert knowledge. Use causal inference techniques to improve the alignment between explanations and real-world processes. |
| **5.4. Uncovering causality for actionable explanations** | Understanding causality in AI models is critical for making explanations actionable, but current methods often fall short in this area. | Develop methods that explicitly model and reveal causal relationships within AI systems. Combine XAI with causal inference tools to create explanations that not only describe correlations but also indicate potential interventions. |

### 6. **Supporting the multi-dimensionality of explainability**

| **Open Problem** | **Description** | **Possible Solutions** |
|---|---|---|
| **6.1. Creating multi-faceted explanations** | AI decisions are often complex and multi-dimensional, requiring explanations that capture this complexity and present it in a user-friendly manner. | Design XAI systems that provide layered explanations, allowing users to drill down from simple overviews to detailed insights. Implement multi-modal explanations that combine text, visuals, and interactive elements. |
| **6.2. Enabling interdisciplinary work in XAI** | XAI research and application require input from diverse fields, but interdisciplinary collaboration is often hindered by differences in terminology, methodology, and goals. | Create interdisciplinary consortia or research groups focused on XAI, facilitating communication and collaboration across fields. Develop shared frameworks and tools that accommodate the needs of different disciplines. |

### 7. **Adjusting XAI methods and explanations**

| **Open Problem** | **Description** | **Possible Solutions** |
|---|---|---|
| **7.1. Adjusting explanations to different stakeholders** | Different stakeholders (e.g., developers, end-users, regulators) have different needs and expectations from AI explanations, requiring tailored approaches. | Develop customizable XAI systems that adjust explanations based on the stakeholder's role, expertise, and goals. Implement user profiling to adapt explanations dynamically based on real-time user feedback. |
| **7.2. Adjusting explanations to different domains** | AI systems are used across diverse domains, each with its own specific requirements for explanations. | Create domain-specific XAI tools that consider the unique needs and challenges of each application area. Collaborate with domain experts to ensure that explanations are relevant and accurate. |
| **7.3. Adjusting explanations to different goals** | The purpose of AI explanations can vary from understanding a decision to auditing an AI system, requiring flexibility in XAI approaches. | Develop XAI methods that can shift focus based on the intended goal, such as providing detailed audit trails for compliance or simplified explanations for general users. Incorporate goal-based metrics into the evaluation of explanations. |

### 8. **Mitigating the negative impact of XAI**

| **Open Problem** | **Description** | **Possible Solutions** |
|---|---|---|
| **8.1. Mitigating failed support by XAI** | XAI methods can sometimes fail to provide adequate support, leading to poor decision-making or a false sense of security among users. | Develop fallback mechanisms that alert users to potential explanation failures and provide alternative forms of support. Regularly update and improve XAI methods based on user feedback and performance metrics. |
| **8.2. Devising criteria for the falsifiability of explanations** | Explanations should be falsifiable, meaning they can be tested and proven wrong if incorrect, but many current methods do not meet this standard. | Implement mechanisms for testing and validating explanations, ensuring they are not only plausible but also verifiable. Develop standards and guidelines for falsifiability in XAI. |
| **8.3. Securing explanations from being abused by malicious human agents** | XAI systems can be exploited by malicious actors to manipulate or deceive, posing a risk to security and trust. | Implement security measures to protect XAI systems from tampering and abuse. Monitor explanations for signs of manipulation and develop tools to detect and prevent such abuses. |
| **8.4. Securing explanations from being abused by malicious superintelligent agents** | As AI systems become more advanced, there is a potential risk that explanations could be manipulated by the AI itself for harmful purposes. | Research and develop safeguards that prevent superintelligent agents from generating misleading or harmful explanations. Incorporate AI ethics and safety protocols into XAI design to mitigate these risks. |

### 9. **Improving the societal impact of XAI**

| **Open Problem** | **Description** | **Possible Solutions** |
|---|---|---|
| **9.1. Facilitating originality attribution of AI-generated data and plagiarism detection** | As AI systems increasingly generate content, it becomes challenging to attribute originality and detect plagiarism. | Develop tools and algorithms that can track the provenance of AI-generated content and detect instances of plagiarism. Collaborate with legal and academic institutions to standardize methods for originality attribution. |
| **9.2. Facilitating the right to be forgotten** | The right to be forgotten is a legal right in many jurisdictions, but it is difficult to enforce in AI systems that store and process large amounts of data. | Implement XAI tools that can identify and selectively remove personal data from AI systems, ensuring compliance with privacy laws. Use privacy-preserving techniques like differential privacy and data anonymization to support this process. |
| **9.3. Addressing the power imbalance between individuals and companies** | AI systems are often controlled by large companies, creating a power imbalance that can disadvantage individuals. | Develop XAI methods that enhance transparency and give individuals more control over how AI systems use their data. Advocate for stronger regulations and policies that protect individuals' rights in AI interactions. |

{% enddetails %}

---

## Making AI Transparent

### Simplifying Complex Ideas

At the core of XAI is the need to explain decisions made by AI systems in ways that humans can understand. This could involve breaking down how a model arrived at a particular decision or providing insights into the model's inner workings. Think of an AI model as a recipe: the ingredients are the data, the cooking process is the algorithm, and the final dish is the model's decision. XAI aims to clarify the recipe so we know why the dish tastes like it does.

To address this, the paper discusses various explanation methods, such as attribution methods that highlight which parts of the input data are most influential in the model’s decision and concept-based methods that explain decisions in terms of human-understandable concepts. The challenge lies in making these explanations both accurate and accessible.


### An Experiment

To understand XAI better, try a simple thought experiment: *Imagine you’re a teacher grading an essay. If you see the final grade without any comments or highlights on what the student did right or wrong, it’s hard to provide constructive feedback. Now, imagine the essay comes with detailed annotations explaining each grading decision---this is similar to what XAI aims to do with AI models. It annotates and explains the decisions so we can understand and trust them*.

---

## Deeper Analysis

### Strengths and Innovations

One of the paper's key strengths is its comprehensive approach to addressing the challenges in XAI. The authors propose innovative methods like mechanistic interpretability, which involves reverse-engineering neural networks to understand their inner workings. This approach is akin to taking apart a clock to see how the gears fit together and make it tick, providing deep insights into the AI's decision-making process.

Additionally, I was particularly intrigued by the discussion of symbolic approaches to XAI, such as concept-based methods. These methods seek to explain AI decisions using human-understandable concepts, which can make AI more relatable and comprehensible. Related to this, the authors also highlight neuro-symbolic approaches, which combine symbolic reasoning with neural networks. This hybrid approach could bridge the gap between traditional, logic-based AI and the more recent data-driven methods, offering explanations that are both logically sound and grounded in data.

Moreover, the paper emphasizes the importance of interdisciplinary collaboration in XAI, bringing together experts in computer science, philosophy, psychology, and beyond to tackle these challenges. This multidisciplinary approach is crucial, as the explanations produced by XAI need to be meaningful not just to AI researchers but to a broad audience, including policymakers, end-users, and the general public.

### Critical Perspective

However, the paper also highlights significant limitations in the current state of XAI. One major issue is the need for more explanation for new types of AI models, such as generative and large language models. These models are like black boxes with numerous parameters, making dissecting and explaining their decisions challenging.

Another limitation is the potential for XAI methods to produce misleading explanations. For example, while practical, popular methods like Shapley values can sometimes create the illusion of understanding without truly capturing the model's decision process. This raises ethical concerns about the reliability of explanations and the potential for misusing or misunderstanding of these methods.

### Ethical Considerations and Societal Impact

The ethical implications of XAI are profound. As AI systems increasingly make decisions that affect our lives, ensuring these decisions are transparent and understandable is critical for building trust. The paper discusses the ethical principle of "explainability" as a core requirement for trustworthy AI, alongside other principles like fairness and harm prevention. The authors call for a balanced approach, where explanations are not just technically sound but also aligned with ethical standards, ensuring that AI systems can be held accountable.

---

## Connecting the Dots

Reflecting on this research, it's clear that XAI is not just about making AI more transparent; it's about bridging the gap between machines and humans. *What surprised me most was that we still grapple with fundamental questions about trust and understanding, even with all our technological advancements*. This paper connects to broader trends in AI governance and ethics, where the focus is increasingly on making AI systems not just more powerful but more responsible.

The authors also mention that the field of XAI is "fermenting," which I found to be an apt description. XAI research's rapid evolution and expansion have led to a situation where we are only scratching the surface of what is possible. The paper offers a slice of the vast literature on XAI, but the reality is that there is much more to explore. This fermentation process suggests that XAI is at a critical juncture with significant potential for growth and impact.

The discussions in this paper also raise important questions about the future of AI: *How do we ensure that as AI becomes more complex, it doesn't become more opaque? How do we balance the need for powerful AI with transparency?* These questions will shape the future of AI and its role in society.

---

## A Call to Curiosity

As you think about the role of AI in your life, consider this: **How much do you trust the decisions made by machines? What would make you trust them more?** These are the kinds of questions that drive research in XAI. Please explore this field further, whether by reading more about AI ethics, experimenting with AI tools, or simply asking more questions about how the technology you use every day works.

---

## Resources for Further Exploration

For those interested in delving deeper into XAI, here are some resources:

- [Explainable Artificial Intelligence (XAI): What we know and what is left to attain Trustworthy Artificial Intelligence](https://www.sciencedirect.com/science/article/pii/S1566253523001148) by Ali et al. for an overview of current research and trends in XAI as well as a taxonomy that incorporates four axes
of XAI.
- [A comprehensive taxonomy for explainable artificial intelligence: a systematic survey of surveys on methods and concepts](https://link.springer.com/article/10.1007/s10618-022-00867-8) by Schwalbe and Finzel for a meta-review of surveys on XAI’s methods and concepts along with a comprehensive taxonomy of the whole field.
- [Explanation in artificial intelligence: Insights from the social sciences](https://www.sciencedirect.com/science/article/pii/S0004370218305988) by Miller for insights from social sciences on XAI.

---

## Let's Talk Science

I invite you to share your thoughts, questions, and experiences with AI in the comments. Let's build a community where we can explore these topics together, making science accessible, exciting, and relevant to everyone.

---

## Conclusion

Explainable AI is not just a technical challenge; it's a societal one. As we move into the future, ensuring that AI systems are transparent, trustworthy, and aligned with human values will be critical. XAI 2.0 is a step towards that future, but it's a journey that requires all of us---researchers, practitioners, and the public---to engage with the science and the questions it raises.