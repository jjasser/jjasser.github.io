---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
Description: ""
Tags: []
Categories: []
DisableComments: true
---
#+++
#title = '{{ replace .File.ContentBaseName "-" " " | title }}'
#date = {{ .Date }}
#draft = true
#+++
