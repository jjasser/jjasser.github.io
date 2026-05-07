+++
author = "Jacob"
title = "AI Red Teaming Is Different: What I'm Learning in the Security Series (Part 1)"
date = "2026-05-06"
description = "Starting an AI security series with the foundational question: why is red teaming AI systems genuinely different from traditional pentesting, and what does that mean for how we approach it?"
tags = [
    "ai-security",
    "red-teaming",
]
categories = [
    "AI Security",
]
series = ["AI Red Teaming"]
thumbnail= "images/series1.jpg"
+++

I've been working through a structured AI red teaming curriculum over the past few weeks, and early on something clicked that reframed how I'd been thinking about this whole space. It wasn't a technique or a tool. It was the realization that AI systems are a fundamentally different class of target, and that the mental models I'd built doing cloud security work don't map cleanly onto this.

That probably sounds obvious from the outside. It wasn't, quite, until I started working through why.

<!--more-->

This is Part 1 of what I expect to be an ongoing series as I move through the material and apply it to real work. Less a summary of what I read, more a record of what landed and how I'm thinking about it.

---

## The Paradigm Shift That Actually Matters

Traditional security has a comfortable feedback loop. You probe a system, something happens or it doesn't, you write it up. Even red teaming, which expanded scope to include people and processes, kept that basic structure intact. Attack, observe, document.

AI systems don't fit that model cleanly, and that gap is worth sitting with before diving into techniques.

What I had to adjust early on was how I thought about risk categories that don't look like security problems at first glance. Fairness, privacy, transparency read like ethics committee agenda items. In practice they're attack surface. A financial advisory chatbot that subtly steers users toward higher-margin products without disclosing that bias isn't just a product ethics issue. It's an SEC concern. An AI coding assistant that regurgitates proprietary code it was trained on isn't a licensing annoyance. It's an IP exposure with real legal standing. Neither of those involves a traditional exploit, and neither shows up in a CVE feed.

The harder part is that these risks rarely resolve cleanly. Something either exploits or it doesn't — that's the world most of us trained in. AI risk lives on a spectrum. A customer-facing chatbot can consistently steer users toward certain outcomes without ever producing an output that's technically wrong. Proving it, scoping it, and writing it up in a way that drives remediation is a different discipline entirely.

> **The uncomfortable truth:** You can't patch a biased dataset. You can't write a firewall rule for a model that's subtly misleading. The toolbox has to grow.

---

## What Actually Changes About Attacker Impact

The part that got my attention most, coming from a cloud security background, was how attacker impact changes when you compromise an AI system versus a traditional one.

I spend a lot of time thinking about blast radius in GCP environments. A compromised service account has permissions. You map the permissions, you understand the blast radius, you remediate. The surface is defined.

AI systems don't work that way. If you can reliably manipulate a model, you're not just reading data or escalating privileges in one environment. You're influencing decisions that other systems and humans consume and act on. At scale.

Three things shift specifically:

---

### 🔍 Value Moves into Behavior

Sensitive data no longer lives only in files and databases. It lives in model outputs, in embeddings, in the decisions a model makes about what to surface and what to suppress. Extracting value from an AI system might not look anything like exfiltrating a file.

---

### ♻️ Persistence Becomes Dynamic

Traditional persistence is about surviving reboots: a cron job, a process, a registry key. In AI systems, persistence can live in a poisoned dataset, a compromised vector database entry, or a long-term memory injection. Those survive container restarts. They propagate into new deployments. A poisoned component can stay effective through redeployments and fine-tuning cycles because the corruption is in the data, not the infrastructure.

---

### 🤖 Systems Act Autonomously

This is where it gets serious for anyone building or securing agentic workflows. An agent that calls tools, opens tickets, sends emails, or triggers cloud actions is an amplifier. If you can influence that agent's behavior through a manipulated prompt or a poisoned context, one injection can generate thousands of downstream actions before anyone notices. Anthropic has written about this in the context of MCP, and it maps directly to architectures I work with professionally.

---

That last point isn't theoretical for me. I've built multi-agent pipelines that pull from external data sources, generate outputs, and hand those outputs to other systems. The trust boundaries in those pipelines deserve the same scrutiny I'd apply to IAM roles or network segmentation. I'm not sure I was giving them that before.

| Traditional Red Teaming | AI Red Teaming |
| ----------------------- | -------------- |
| Access systems | Manipulate decisions |
| Disk-based persistence | Poisoned data persistence |
| Infrastructure control | Autonomous action cascades |
| Binary pass/fail findings | Spectrum-based risk assessment |

---

## Business Impact Is the Translation Layer

One thing I've learned doing cloud security work is that technical findings don't move people. Business impact statements do. This is doubly true for AI risk, where the attack patterns are unfamiliar and the findings are harder to communicate.

The material walked through a set of questions worth keeping close when documenting findings:

1. What decisions does this system make?
2. Who or what consumes its output?
3. How many transactions happen downstream?
4. What's the potential financial impact of manipulation?
5. What regulatory frameworks apply?
6. How long would remediation take?

I've started running these against every AI component I think about now. The exercise of translating a raw finding into a business risk statement is uncomfortable but useful. It forces precision about what you're actually claiming.

> **Example:** `"Unvalidated RAG ingestion"` becomes `"An attacker can inject false contract terms into legal document retrieval, potentially causing regulatory violations carrying significant financial penalties and months of legal review."`

That translation is what gets findings on a roadmap instead of a backlog.

The Gartner and IBM numbers floating around the industry are worth knowing: significant percentages of projected AI-related breaches are expected to involve cross-border generative AI misuse, and average breach costs continue climbing. These aren't arguments by themselves, but they give context when you're making the case internally that this work matters.

---

## The Frameworks Worth Knowing

Three frameworks are getting meaningful traction for AI red teaming, and they complement each other in ways that are worth understanding rather than just bookmarking.

| Framework | Purpose | Best used for |
| --------- | ------- | ------------- |
| [MITRE ATLAS](https://atlas.mitre.org/) | Technique taxonomy | Tagging findings, structuring playbooks |
| [OWASP Top 10 for LLMs](https://owasp.org/www-project-top-10-for-large-language-model-applications/) | Application-layer risks | Scoping assessments, writing mitigations |
| [NVIDIA AI Kill Chain](https://developer.nvidia.com/blog/modeling-attacks-on-ai-powered-apps-with-the-ai-kill-chain-framework/) | Adversary lifecycle sequencing | Identifying defensive chokepoints |

**MITRE ATLAS** extends ATT&CK into machine learning, giving you shared vocabulary across training, inference, and deployment. When I eventually get to attacking RAG systems or supply chains in this curriculum, I expect to be tagging findings back to ATLAS techniques. That consistency matters when you're writing reports that defenders need to act on.

**OWASP Top 10 for LLMs** describes the common application-layer problems: prompt injection, insecure output handling, RAG misconfiguration, data leakage. For red teamers it's a checklist of what to test. For blue teams it maps to concrete mitigations implementable in code or runtime policy.

**NVIDIA's AI Kill Chain** sequences attack activities through Recon, Poison, Hijack, Persist, and Impact. What I find useful about this framing is that it highlights where a defender can interrupt the chain. Validating ingestion prevents poisoning. Vetting tools prevents hijacking. It forces you to ask where the defensible chokepoints actually are rather than trying to defend everything at once.

Together these three give you taxonomy, attack patterns, and sequencing. None of them alone is sufficient, but having all three in your head when you're scoping an assessment or documenting a finding covers a lot of ground.

---

## Where This Is Going

I'm early in this curriculum and deliberately going through it slowly enough to actually apply what I'm learning rather than just read through it. The [Gandalf walkthrough](/post/gandalf-post/) I posted previously was a warmup. The techniques it demonstrated sit inside a much larger threat model, and I'm starting to see where they connect.

What I've come to think after working through this first section: AI red teaming isn't a specialty that replaces traditional security work. It's an extension of it that requires new vocabulary, new mental models, and honest acknowledgment that some of what we're assessing doesn't have clean pass/fail answers. That's uncomfortable for people who like their findings unambiguous.

It's also where the interesting work is.

*More to come as I move through the material.*
