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

<!-- The site mirrors the CV bibliography: papers.bib is shared with the CV, and everything the CV prints appears here, including the under-review manuscripts. The only exclusion is @misc, which the CV's own biblatex filters do not print either. -->

{% bibliography --query !@misc %}

</div>
