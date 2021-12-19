import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import { parseHTML } from 'linkedom';

async function fetchPage(year) {
  const URL = `https://priem.mirea.ru/first-degree/selection/${year}`;

  const data = await fetch(URL);
  return await data.text();
}

function getRows(document) {
  const rows = [];
  let rowSpan = 1;
  let bufNode;
  for (let val of document.querySelectorAll('#collapse1 tbody tr').values()) {
    if (val.textContent.search(/филиал/gi) != -1) break;
    if (val.classList.contains('table-primary')) continue;
    if (parseInt(val.children[0].attributes?.rowspan?.value) > 1) {
      rowSpan = parseInt(val.children[0].attributes.rowspan.value);
      bufNode = val.children[0].cloneNode(true);
      bufNode.attributes.rowspan.value = '1';
      rows.push(val);
      continue;
    }

    if (rowSpan > 1) {
      val.insertBefore(bufNode, val.children[0]);
      rowSpan--;
    }
    rows.push(val);
  }

  return rows;
}

function getTableData(html) {
  const data = [];
  const { document } = parseHTML(html);
  const rows = getRows(document);

  rows.forEach((row) => {
    const cells = row.children;
    if (parseInt(cells[2].firstChild.textContent) > 0) {
      try {
        const buf = {
          code: cells[0].firstChild.textContent,
          title: cells[1].textContent.replace(' ', ' '),
          budgetPlaces: parseInt(cells[2].firstChild.textContent),
          contest: parseFloat(
            cells[3].firstChild.textContent.replace(',', '.')
          ),
          passingGrade: parseInt(cells[4].firstChild.textContent),
          avgGrade: parseFloat(
            cells[5].firstChild.textContent.replace(',', '.')
          ),
          commerceAccepted: parseInt(cells[6].firstChild.textContent),
        };
        data.push(buf);
      } catch (e) {
        rows.indexOf(row);
      }
    }
  });

  return data;
}

async function main() {
  const statistics = [];
  for (let year = 2014; year <= 2021; year++) {
    const rawHtml = await fetchPage(year);
    const data = getTableData(rawHtml);
    statistics.push({ year, data });
    console.log(`Year ${year} is parsed!`);
  }

  await fs.writeFile('mirea-statistics.json', JSON.stringify(statistics), {
    encoding: 'utf-8',
  });
}

main();
