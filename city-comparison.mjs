import {language, getText} from './i18n.mjs';
import {createYearRuler} from './year-ruler.mjs';
import {refinementCopy, moistureBand, moistureSource, experienceCopy} from './refinement-copy.mjs';

export function createComparison({places, name, country, isCountry, measures, criteria, population, normalize, onPair, onYear}) {
  const dialog = document.createElement('dialog');
  dialog.id = 'city-comparison';
  dialog.innerHTML = '<div class="compare-shell"><header><div><p class="compare-eyebrow">TERRA / 2050</p><h2 id="comparison-title"></h2></div><button class="compare-close" type="button">×</button></header><div class="compare-picker"><label for="comparison-search"></label><input id="comparison-search" type="search" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="comparison-results"><ul id="comparison-results" role="listbox"></ul></div><div class="compare-time"><label for="comparison-year"></label><output for="comparison-year"></output><div class="regle" aria-hidden="true"></div><input id="comparison-year" type="range" min="2026" max="2050" value="2050"><button class="compare-swap" type="button"></button></div><p class="compare-period"></p><div class="compare-table-wrap"><table><thead></thead><tbody></tbody></table></div></div>';
  dialog.setAttribute('aria-labelledby', 'comparison-title');
  dialog.querySelector('.compare-shell').prepend(dialog.querySelector('.compare-close'));
  document.body.append(dialog);
  let first, second, results = [], active = -1, trigger;
  const search = dialog.querySelector('#comparison-search'), list = dialog.querySelector('ul'), slider = dialog.querySelector('input[type=range]');
  const text = () => refinementCopy(language());
  globalThis.gsap.ticker.add(createYearRuler(slider,dialog.querySelector('.regle')));
  const format = value => Math.abs(value) > 0 && Math.abs(value) < .01 ? `${value < 0 ? '−' : ''}<${(.01).toLocaleString(language())}` : value.toLocaleString(language(), {maximumFractionDigits:2});
  const node = (tag, value, className) => {const el = document.createElement(tag); el.textContent = value; if(className) el.className = className; return el;};
  function render() {
    const c = text(), year = +slider.value;
    dialog.querySelector('h2').textContent = c.compare;
    dialog.querySelector('.compare-close').setAttribute('aria-label', c.close);
    const searchLabel = isCountry(first) ? c.searchCountry : c.searchCity;
    dialog.querySelector('.compare-picker label').textContent = searchLabel;
    search.placeholder = searchLabel;
    dialog.querySelector('.compare-time label').textContent = c.year;
    dialog.querySelector('output').textContent = year;
    dialog.querySelector('.compare-swap').textContent = experienceCopy(language()).replace;
    dialog.querySelector('.compare-swap').disabled = !second;
    dialog.querySelector('.compare-period').textContent = c.period;
    const heading = document.createElement('tr');
    heading.append(node('th', c.meaning));
    for(const place of [first,second]) {
      const cell = node('th', place ? name(place) : searchLabel);
      cell.scope = 'col';
      if(place && !isCountry(place)) cell.append(node('small', country(place[1])));
      heading.append(cell);
    }
    dialog.querySelector('thead').replaceChildren(heading);
    const rows = [], samples = [first, second].map(place => place ? measures(place,year) : null);
    criteria.forEach((criterion,index) => {
      const row = document.createElement('tr'), heading = node('th', criterion.cle === 'eau' ? c.humidity : getText().critere[criterion.cle]);
      heading.scope = 'row';
      if(criterion.cle !== 'mer' && criterion.cle !== 'fleuves') heading.append(node('small',c.summary[index]));
      row.append(heading);
      for(const sample of samples) {
        const reading = sample?.[criterion.cle], cell = document.createElement('td');
        cell.dataset.metric = criterion.cle;
        if(reading?.available) {
          const unit = reading.unit === 'days/year' ? getText().ui.daysyear : reading.unit === 'De Martonne index' ? 'De Martonne' : reading.unit;
          cell.dataset.value = reading.value;
          const value = node('strong', format(reading.value)); value.append(node('span',unit,'compare-unit')); cell.append(value);
          if(criterion.cle === 'eau' && !reading.country) {
            const band = node('a',moistureBand(reading.value,language()),'moisture-band');
            band.href=moistureSource;band.target='_blank';band.rel='noopener';cell.append(band);
          }
          cell.append(node('small', `${c.baseline}: ${format(reading.baseline)}`));
          cell.append(node('span', `${reading.change > 0 ? '+' : ''}${format(reading.change)} ${unit} · ${c.change}`, 'compare-change'));
          if(reading.country) cell.append(node('small',`${getText().panelCountryNote(reading.contributingCities)}${reading.regionalCities ? ` · ${c.regionalScore}: ${reading.regionalCities}/${reading.contributingCities}` : ''}`,'compare-provenance'));
          else if(criterion.cle === 'mer' || criterion.cle === 'fleuves') cell.append(node('small',reading.regionalFallback ? c.regionalFlood : c.cell,'compare-provenance'));
          else if(reading.regionalFallback) cell.append(node('small',c.regional,'compare-provenance'));
        } else cell.append(node('strong','—'),node('small', second ? c.missing : searchLabel));
        row.append(cell);
      }
      rows.push(row);
    });
    const row = document.createElement('tr'); row.append(node('th',c.population));
    for(const place of [first,second]) {
      const value = place ? population(place[1],year) : null;
      row.append(node('td', Number.isFinite(value) ? new Intl.NumberFormat(language(),{notation:'compact',maximumFractionDigits:1}).format(value) : '—'));
    }
    rows.push(row); dialog.querySelector('tbody').replaceChildren(...rows);
  }
  function clearResults() {
    results = []; active = -1; list.replaceChildren();
    search.setAttribute('aria-expanded','false'); search.removeAttribute('aria-activedescendant');
  }
  function select(place) {
    if(place === first || isCountry(place) !== isCountry(first)) return;
    second = place; search.value = name(place); clearResults();
    onPair(first,second); render(); slider.focus();
  }
  function find() {
    const query = normalize(search.value.trim()); active = -1;
    results = query ? places().filter(place => place !== first && isCountry(place) === isCountry(first) && normalize([name(place),place[0],place[6],place[8]].join(' ')).includes(query)).sort((a,b)=> b[4]-a[4]).slice(0,8) : [];
    list.replaceChildren(...results.map((place,index)=>{
      const item = node('li',isCountry(place) ? name(place) : `${name(place)} · ${country(place[1])}`);
      item.id = `compare-result-${index}`; item.role = 'option'; item.setAttribute('aria-selected','false');
      item.addEventListener('click',()=>select(place)); return item;
    }));
    if(query && !results.length) list.append(node('li',text().emptyPlace,'compare-empty'));
    search.setAttribute('aria-expanded',String(!!query)); search.removeAttribute('aria-activedescendant');
  }
  search.addEventListener('input',find);
  search.addEventListener('keydown',event=>{
    if(['ArrowDown','ArrowUp'].includes(event.key) && results.length) {
      event.preventDefault(); active = active < 0 ? (event.key === 'ArrowDown' ? 0 : results.length - 1) : (active + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      [...list.children].forEach((el,index)=>el.setAttribute('aria-selected',String(index === active)));
      search.setAttribute('aria-activedescendant',list.children[active].id);
      list.children[active].scrollIntoView({block:'nearest'});
    } else if(event.key === 'Enter' && results.length) {event.preventDefault();select(results[Math.max(0,active)]);}
  });
  slider.addEventListener('input',()=>{onYear(+slider.value);render();});
  dialog.querySelector('.compare-swap').addEventListener('click',()=>{
    // Keep the current comparison until a replacement has actually been chosen.
    search.value='';clearResults();search.focus();
  });
  dialog.querySelector('.compare-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>trigger?.focus());
  dialog.addEventListener('keydown',event=>event.stopPropagation());
  window.addEventListener('terra-language',()=>{if(dialog.open)render();});
  return {
    open(a,b,year) {first=a;second=b && b !== a && isCountry(b) === isCountry(a) ? b : null;trigger=document.activeElement;slider.value=year;search.value=second?name(second):'';clearResults();render();dialog.showModal();dialog.scrollTop=0;search.focus({preventScroll:true});search.select();}
  };
}
