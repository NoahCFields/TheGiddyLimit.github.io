"use strict";

class RacesPage extends ListPage {
	static _getInvertedName (name) {
		// convert e.g. "Elf (High)" to "High Elf" for use as a searchable field
		const bracketMatch = /^(.*?) \((.*?)\)$/.exec(name);
		return bracketMatch ? `${bracketMatch[2]} ${bracketMatch[1]}` : null;
	}

	constructor () {
		const pageFilter = new PageFilterRaces();
		super({
			dataSource: async () => {
				const rawRaceData = await DataUtil.loadJSON("data/races.json");
				const raceData = Renderer.race.mergeSubraces(rawRaceData.race, {isAddBaseRaces: true});
				return {race: raceData};
			},
			dataSourceFluff: "data/fluff-races.json",

			pageFilter,

			listClass: "races",

			sublistClass: "subraces",

			dataProps: ["race"],

			hasAudio: true
		});
	}

	_addData (data) {
		if (data.race && data.race.length) super._addData(data);
		if (!data.subrace || !data.subrace.length) return;

		// Attach each subrace to a parent race, and recurse
		const nxtData = Renderer.race.adoptSubraces(this._dataList, data.subrace);

		if (nxtData.length) this._addData({race: Renderer.race.mergeSubraces(nxtData)})
	}

	getListItem (race, rcI, isExcluded) {
		this._pageFilter.mutateAndAddToFilters(race, isExcluded);

		const ability = race.ability ? Renderer.getAbilityData(race.ability) : {asTextShort: "None"};

		const eleLi = document.createElement("li");
		eleLi.className = `row ${isExcluded ? "row--blacklisted" : ""}`;

		const hash = UrlUtil.autoEncodeHash(race);
		const size = Parser.sizeAbvToFull(race.size || SZ_VARIES);
		const source = Parser.sourceJsonToAbv(race.source);

		eleLi.innerHTML = `<a href="#${hash}" class="lst--border">
			<span class="bold col-4 pl-0">${race.name}</span>
			<span class="col-4">${ability.asTextShort}</span>
			<span class="col-2">${size}</span>
			<span class="col-2 text-center ${Parser.sourceJsonToColor(race.source)} pr-0" title="${Parser.sourceJsonToFull(race.source)}" ${BrewUtil.sourceJsonToStyle(race.source)}>${source}</span>
		</a>`;

		const listItem = new ListItem(
			rcI,
			eleLi,
			race.name,
			{
				hash,
				ability: ability.asTextShort,
				size,
				source,
				cleanName: RacesPage._getInvertedName(race.name) || "",
				alias: (race.alias || [])
					.map(it => {
						const invertedName = RacesPage._getInvertedName(it);
						return [`"${it}"`, invertedName ? `"${invertedName}"` : false].filter(Boolean);
					})
					.flat()
					.join(",")
			},
			{
				uniqueId: race.uniqueId ? race.uniqueId : rcI,
				isExcluded
			}
		);

		eleLi.addEventListener("click", (evt) => this._list.doSelect(listItem, evt));
		eleLi.addEventListener("contextmenu", (evt) => ListUtil.openContextMenu(evt, this._list, listItem));

		return listItem;
	}

	handleFilterChange () {
		const f = this._pageFilter.filterBox.getValues();
		this._list.filter(it => this._pageFilter.toDisplay(f, this._dataList[it.ix]));
		FilterBox.selectFirstVisible(this._dataList);
	}

	getSublistItem (race, pinId) {
		const hash = UrlUtil.autoEncodeHash(race);

		const $ele = $(`
			<li class="row">
				<a href="#${UrlUtil.autoEncodeHash(race)}" class="lst--border">
					<span class="bold col-5 pl-0">${race.name}</span>
					<span class="col-5">${race._slAbility}</span>
					<span class="col-2 pr-0">${Parser.sizeAbvToFull(race.size || SZ_VARIES)}</span>
				</a>
			</li>
		`).contextmenu(evt => ListUtil.openSubContextMenu(evt, listItem));

		const listItem = new ListItem(
			pinId,
			$ele,
			race.name,
			{
				hash,
				ability: race._slAbility
			}
		);
		return listItem;
	}

	doLoadHash (id) {
		const renderer = this._renderer;
		renderer.setFirstSection(true);
		const $content = $("#pagecontent").empty();
		const race = this._dataList[id];

		function buildStatsTab () {
			$content.append(RenderRaces.$getRenderedRace(race));
		}

		function buildFluffTab (isImageTab) {
			return Renderer.utils.pBuildFluffTab({
				isImageTab,
				$content,
				entity: race,
				pFnGetFluff: Renderer.race.pGetFluff
			});
		}

		const traitTab = Renderer.utils.tabButton(
			"Traits",
			() => {},
			buildStatsTab
		);
		const infoTab = Renderer.utils.tabButton(
			"Info",
			() => {},
			buildFluffTab
		);
		const picTab = Renderer.utils.tabButton(
			"Images",
			() => {},
			buildFluffTab.bind(null, true)
		);

		Renderer.utils.bindTabButtons(traitTab, infoTab, picTab);

		ListUtil.updateSelected();
	}

	async pDoLoadSubHash (sub) {
		sub = this._filterBox.setFromSubHashes(sub);
		await ListUtil.pSetFromSubHashes(sub);
	}
}

const racesPage = new RacesPage();
window.addEventListener("load", () => racesPage.pOnLoad());
