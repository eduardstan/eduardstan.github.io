---
layout: page
permalink: /publications/
title: publications
description: publications by categories in reversed chronological order.
nav: true
nav_order: 2
---

<!-- _pages/publications.md -->

<!-- Bibsearch Feature -->

{% include bib_search.liquid %}

<div class="publications">

<!-- The site lists published work only: papers.bib is shared with the CV, which keeps its own "Under review" section, so hide the under-review manuscripts and the @misc dataset artifacts here rather than removing them from the bibliography. -->

{% bibliography --query !@misc[keywords!~underreview] %}

</div>
