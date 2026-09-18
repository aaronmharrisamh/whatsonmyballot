# B.7F local PDF dependencies

- pdfmake 0.3.11: official npm browser distribution, copied unchanged from the installed package. MIT license: LICENSE.txt.
- Roboto: original font bytes bundled by pdfmake 0.3.11 in vfs_fonts.js. Apache 2.0 license: Roboto-LICENSE.txt. Upstream license: https://github.com/googlefonts/roboto/blob/main/LICENSE.
- glyphs.json is a generated intersection of the regular and medium fonts’ character maps. It prevents silent missing-glyph boxes. Print my Guide uses browser fonts for text outside this PDF font.
- No CDN or network request is needed at runtime. SHA-256 hashes below pin these local files.
