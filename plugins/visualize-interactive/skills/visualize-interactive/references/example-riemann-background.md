# Background: the Riemann hypothesis

Status checked 24 November 2026 with fresh searches and the primary sources below; it is changing daily, so look up anything about status. "Computed" values were calculated for this file.

## Words
- Prime: a whole number above 1 divisible only by 1 and itself. 1 is not prime: with 1 allowed, numbers would not break into primes in only one way.
- Prime count, pi(x): how many primes are at most x.
- li here: the integral of 1/ln(t) from 2 to x. Often called Gauss's estimate. Gauss noticed the pattern as a teenager around 1792; the proof came a century later.
- Zeta function: for s above 1, zeta(s) = 1 + 1/2^s + 1/3^s + ... Euler showed it equals the product over primes p of 1/(1 - p^-s), which is why it knows about primes. It extends to all complex numbers except s = 1.
- Complex number: a + bi, a point on a plane: a across, b up.
- Zero: an input where the function gives 0. Trivial zeros are at -2, -4, -6, ... Nontrivial zeros all lie in the critical strip, real part between 0 and 1.
- Critical line: real part exactly 1/2. Zeros mirror across it and across the real axis, so a zero off the line would come in a group of four.
- Explicit formula: an exact formula for a weighted prime count, psi, as x minus one wave per zero. A zero at 1/2 + i*g gives a wave of size about sqrt(x)/g that repeats each time ln(x) grows by 2*pi/g.
- psi(x): adds ln(p) for every prime power p^k up to x. Used in step 5 because its formula is simpler than the one for pi(x).

## Computed: primes against the estimate
x | primes up to x | estimate (li from 2) | estimate minus count
10 | 4 | 5.1 | 1.1
100 | 25 | 29.1 | 4.1
1,000 | 168 | 176.6 | 8.6
10,000 | 1,229 | 1,245.1 | 16.1
100,000 | 9,592 | 9,628.8 | 36.8
1,000,000 | 78,498 | 78,626.5 | 128.5
10,000,000 | 664,579 | 664,917.4 | 338.4
Primes up to 100: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97.
First zeros (heights): 14.1347, 21.0220, 25.0109, 30.4249, 32.9351, 37.5862, 40.9187, 43.3271, 48.0052, 49.7738, 52.9703, 56.4462.
Average miss between the step 5 curve and staircase, x from 3.5 to 48.5: 0 zeros 0.83; 1 zero 0.72; 5 zeros 0.55; 10 zeros 0.44; 30 zeros 0.26.

## History
- About 300 BC: Euclid proves there are infinitely many primes.
- 1737: Euler links zeta to primes.
- 1859: Riemann's eight-page paper states the hypothesis. He called it very likely and set the proof aside.
- 1896: Hadamard and de la Vallee Poussin, separately, prove the prime number theorem: pi(x) is about x/ln(x). The key is that no zero has real part exactly 1.
- 1900: Hilbert lists it as part of his eighth problem.
- 1901: von Koch shows the hypothesis is equivalent to the error in the estimate being at most about sqrt(x) * ln(x).
- 1914: Hardy proves infinitely many zeros lie on the line. Littlewood proves estimate and count swap order infinitely often.
- 2000: the Clay Institute makes it a Millennium Problem, $1 million.
- 2020: Platt and Trudgian verify that every zero up to height 3*10^12 is on the line (arXiv:2004.09765). Quanta describes this as the first 12 trillion zeros.

## Current status, 24 November 2026
- 20 November 2026: Levent Alpoge, an Anthropic researcher, announced a proof found with Claude, for the Riemann hypothesis and for the generalized one (Dirichlet L-functions). He released a four-page note and about 17 million lines of Lean, a language in which a computer checks every step. Note: https://alpo.ge/remark.pdf
- 21 November: the Lean FRO and the Mathlib Initiative, independent of Anthropic, jointly stated "We have full confidence that Alpoge's proof of the Riemann Hypothesis is correct" and certified both the statement and the proof. Source: https://leanprover-community.github.io/blog/posts/riemann-hypothesis/
- Checks reported by Andrew Sutherland (MIT), 24 November: all 175,187 modules compile; only Lean's three standard axioms; Lean's kernel and independently written checkers (nanoda, con-leche) accept the full exported proof; one last end-to-end run was still in progress. Source: https://math.mit.edu/~drew/grh/
- What it means: that the theorem is formally proved is about as well checked by machine as anything this size has been. Still missing: a proof people can read, human understanding, peer review, the Clay prize (which requires publication and a waiting period).
- Reactions: Brian Conrey, "a monumental moment in human history" (before seeing a manuscript). Daniel Litt, "exceedingly likely to be correct", but no human understands it yet. Andrew Granville called the four-page note garbled. Some mathematicians say a Lean proof alone is not enough to settle a result.
- The "250,000 pages" remark was a joke, Alpoge said on 23 November.
- Same day, Ravi Vakil posted a separate, human-written 940-page draft by Alessandro Maria Masullo. Problems were reported within hours; its status is unclear. It is not the Lean proof.
- Not covered: the extended and grand Riemann hypotheses remain open.
- Yukitaka Abe's "A rigorous proof" preprint (many versions since 2024) is a different, unaccepted claim; another Abe preprint on zeta zeros was retracted.
- Earlier in 2026, before this announcement:
- August 2026, Anthropic: an unreleased research version of Claude proved that at least 67.2% of nontrivial zeros are on the line; the earlier bound was 41.6%. Anthropic mathematicians Levent Alpoge and Ralph Furman validated the paper and wrote a shorter proof; Brian Conrey and Dan Goldston examined it on short notice. A Lean formalization exists. Anthropic does not expect this method to prove the hypothesis. Source: https://www.anthropic.com/research/riemann-zeta
- October 2026, OpenAI: announced on 6 October that a model proved all nontrivial zeros lie in a narrower strip. The 30 September version gives 1/8 to 7/8 and is verified in Lean (199 pages). The 5 October version gives 1/12 to 11/12 and is not formally verified (49 pages). Experts largely agree it is correct; not published in a journal; Peter Sarnak wants humans to check every detail first. Source: https://quantamagazine.org/ai-proved-the-quasi-riemann-hypothesis-what-happens-now-20261019
- Other circulating "proofs" and "disproofs", including a 2026 preprint titled "The Riemann Hypothesis is false", are not accepted.

## What it would mean
- If the proof stands: the estimate is never off by more than about sqrt(x) * ln(x). Many theorems that begin "assume the Riemann hypothesis" become unconditional.
- If it had been false: one zero off the line would mean larger swings in the prime count.
- It would not by itself break encryption. Common encryption relies on factoring being slow; the hypothesis gives no known fast way to factor.

## Common misunderstandings
- "Checked for trillions, so it is true": Checks cannot cover infinitely many zeros. Patterns have failed late before: the estimate exceeds the count for every x ever checked, yet Littlewood proved that reverses eventually.
- "67.2% is the chance it is true": No. It is a guaranteed minimum share of zeros on the line.
- "It gives a formula for the next prime": No. It limits how far the count can stray.
- "Primes are random": They are fully determined; they only look random up close.
