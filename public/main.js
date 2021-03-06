const SITEURL = "https://creatoodnrater.herokuapp.com/";

const IDS = {
	TOOLBAR: {
		ROOT: "toolbar",

		COPYRIGHT: "toolbar-copyright"
	},

	AUTH: {
		ROOT: "authPanel",

		FORM: {
			ROOT: "authPanel_authForm",

			INSTANCE: {
				ROOT: "authPanel_authForm_instance",
				SELECTOR: "authPanel_authForm_instance-items"
			},

			SUBMIT: "authPanel_authForm_submit"
		}
	},

	CONTROL: {
		ROOT: "controlPanel",

		INSTANCE: "controlPanel_instance",
		SIGNOUT: "controlPanel_signOut",

		TOOTAREA: {
			ROOT: "controlPanel_tootArea",

			PUBLIC: "controlPanel_tootArea-public",
			UNLISTED: "controlPanel_tootArea-unlisted",
			PRIVATE: "controlPanel_tootArea-private",
			DIRECT: "controlPanel_tootArea-direct"
		},

		APPS: {
			ROOT: "controlPanel_apps",

			TOOTRATER: "controlPanel_apps_app-tootRater",
			TPD: "controlPanel_apps_app-tpd",

			RELEVANCE: {
				ROOT: "controlPanel_apps_app-relevanceAnalyzer",

				DIALOGS: {
					DATEAREA: {
						ROOT: "controlPanel_dialogs-relevanceAnalyzer-dateArea",
						DATE: "controlPanel_dialogs-relevanceAnalyzer-dateArea_date"
					},

					CONFIRMER: {
						ROOT: "controlPanel_dialogs-relevanceAnalyzer-tootConfirmer",
						CONTENT: "controlPanel_dialogs-relevanceAnalyzer-tootConfirmer_content"
					}
				}
			}
		}
	},

	NOTIFY: "notify"
}

const CLASSES = {
	PANEL: {
		ROOT: "mstdnRater_panel",
		DISABLED: "mstdnRater_panel-disabled"
	},

	APPS: {
		RUNNING: "mstdnRater_app-running"
	}
}

const SERVERS = {
	"https://gamelinks007.net": {
		CLIENTID: process.env.CLIENT_KEY,
		SECRETID: process.env.SECRET_KEY
	}
}



let app = null;

let appInfo = new AppInfo();
	appInfo.scopes = ["read", "write"],
	appInfo.redirectUrl = (() => {
		let url = new URL(location.href);
			url.search = "";

		return url.href;
	})();



window.addEventListener("DOMContentLoaded", () => {
	window.mdc.autoInit();



	let query = location.querySort();
	
	if (appInfo.accessToken) {
		app = new MastodonAPI({ instance: appInfo.instance, api_user_token: appInfo.accessToken });

		document.getElementById(IDS.AUTH.ROOT).classList.toggle(CLASSES.PANEL.DISABLED),
		document.getElementById(IDS.CONTROL.ROOT).classList.toggle(CLASSES.PANEL.DISABLED);
	} else if (query.CODE) {
		app = new MastodonAPI({ instance: appInfo.instance });

		app.getAccessTokenFromAuthCode(SERVERS[appInfo.instance].CLIENTID, SERVERS[appInfo.instance].SECRETID, appInfo.redirectUrl, query.CODE, res => {
			appInfo.tootArea = "public",
			appInfo.accessToken = res.access_token;
			
			location.href = appInfo.redirectUrl;
		});
	}
});

window.addEventListener("DOMContentLoaded", () => {
	let notify = new Notify(document.getElementById(IDS.NOTIFY));

	let authForm = document.getElementById(IDS.AUTH.FORM.ROOT);
		authForm.querySelector(`#${IDS.AUTH.FORM.SUBMIT}`).addEventListener("click", () => {
			let instanceUrl = new mdc.select.MDCSelect(authForm.querySelector(`#${IDS.AUTH.FORM.INSTANCE.ROOT}`));
			
			if (instanceUrl.value) {
				appInfo.instance = instanceUrl.value;
				app = new MastodonAPI({ instance: appInfo.instance });

				location.href = app.generateAuthLink(SERVERS[appInfo.instance].CLIENTID, appInfo.redirectUrl, "code", appInfo.scopes);
			}
		});

	let controlPanel = document.getElementById(IDS.CONTROL.ROOT);
		controlPanel.querySelector(`#${IDS.CONTROL.INSTANCE}`).textContent = appInfo.instance;

		controlPanel.querySelector(`#${IDS.CONTROL.SIGNOUT}`).addEventListener("click", () => {
			appInfo.tootArea = "",
			appInfo.accessToken = "",
			appInfo.instance = "";

			location.reload();
		});

		new mdc.select.MDCSelect(controlPanel.querySelector(`#${IDS.CONTROL.TOOTAREA.ROOT}`)).listen("MDCSelect:change", res => appInfo.tootArea = res.detail.value.replace(`${IDS.CONTROL.TOOTAREA.ROOT}-`, ""));



	let apps = document.getElementById(IDS.CONTROL.APPS.ROOT);
		apps.querySelector(`#${IDS.CONTROL.APPS.TOOTRATER}`).addEventListener("click", (event) => {
			event.preventDefault();

			notify.begin();
			event.target.classList.add(CLASSES.APPS.RUNNING);

			let serverInfo = {},
				userInfo = {};

				app.get("instance").then(res => serverInfo = res).then(res => {
					app.get("accounts/verify_credentials").then(res => userInfo = res).then(res => {
						let serverToots = serverInfo.stats.status_count,
							userToots = userInfo.statuses_count;

						app.post("statuses", {
							status: [
								`@${userInfo.username} さんの`,
								`#トゥート率 は${(userToots / serverToots * 100).toFixed(2)}%です！`,
								"",
								"(Tooted from #MastodonRater)",
								SITEURL
							].join("\r\n"),

							visibility: appInfo.tootArea
						}).then(() => {
							notify.finish();
							event.target.classList.remove(CLASSES.APPS.RUNNING);
						});
					});
				});
		});

		apps.querySelector(`#${IDS.CONTROL.APPS.TPD}`).addEventListener("click", (event) => {
			event.preventDefault();

			notify.begin();
			event.target.classList.add(CLASSES.APPS.RUNNING);

			app.get("accounts/verify_credentials").then(res => {
				let nowTime = new Date().getTime(),
					createdAt = new Date(res.created_at).getTime();

				let countDays = Math.floor((nowTime - createdAt) / (1000 * 60 * 60 * 24));

				app.post("statuses", {
					status: [
						`@${res.username} さんの`,
						`経過日数は${countDays}日`,
						`#TPD は${Math.floor(res.statuses_count / countDays)}です！`,
						"",
						"(Tooted from #MastodonRater)",
						SITEURL
					].join("\r\n"),

					visibility: appInfo.tootArea
				}).then(() => {
					notify.finish();
					event.target.classList.remove(CLASSES.APPS.RUNNING);
				});
			});
		});

		(() => {
			let tootContent = "";

			let rootBtn = apps.querySelector(`#${IDS.CONTROL.APPS.RELEVANCE.ROOT}`);
				rootBtn.addEventListener("click", (event) => {
					event.preventDefault();

					dateAreaDialog.show();
				});

			let dateAreaDialog = new mdc.dialog.MDCDialog(rootBtn.parentNode.querySelector(`#${IDS.CONTROL.APPS.RELEVANCE.DIALOGS.DATEAREA.ROOT}`));
				dateAreaDialog.listen("MDCDialog:accept", () => {
					notify.begin();
					rootBtn.classList.add(CLASSES.APPS.RUNNING);

					let dateArea = rootBtn.parentNode.querySelector(`#${IDS.CONTROL.APPS.RELEVANCE.DIALOGS.DATEAREA.DATE}`).value;
					let date = Util.getTheday(new Date(Date.now() - 1000 * 60 * 60 * 24 * dateArea));

					let myself = {};
						app.get("accounts/verify_credentials").then(res => myself = res).then(() => {
							let friends = [];
								Relevance.getFriends(myself.id).then(res => friends = res).then(() => {
									Relevance.getBoostsAndMentions(myself.id, friends, date).then(res => friends = res).then(() => {
										Relevance.getStars(friends, date).then(res => friends = res).then(() => {
											let scores = [];
											
											for (let friend of friends) {
												if (friend) {
													scores.push([friend.acct, friend.star * Relevance.STAR + friend.boost * Relevance.BOOST + friend.mention * Relevance.MENTION]);
												}
											}

											scores.sort((score1, score2) => {
												if (score1[1] > score2[1]) return -1;
												if (score1[1] < score2[1]) return 1;

												return 0;
											});

											tootContent = rootBtn.parentNode.querySelector(`#${IDS.CONTROL.APPS.RELEVANCE.DIALOGS.CONFIRMER.CONTENT}`).textContent = [
												"#RelevanceAnalyzer",
												`${dateArea == 0 ? "本日分" : dateArea + "日前まで"}の #統計さん`,
												"",
												`@${myself.username} さんと`,
												`仲良しのユーザーは`,
												"",
												(rank => {
													let ranking = [];

													for (let i = 0; i < rank; i++) {
														ranking.push([
															`《${i + 1}位》`,
															`${scores[i][0]}(Score ${scores[i][1]})`,
															""
														].join("\r\n"));
													}

													return ranking.join("\r\n");
												})(3),
												"の方々です！！",
												"",
												"(Tooted from #MastodonRater)",
												SITEURL
											].join("\r\n");

											tootConfirmer.show();

											console.log(scores);
										});
									});
								});
						});
				});

			let tootConfirmer = new mdc.dialog.MDCDialog(rootBtn.parentNode.querySelector(`#${IDS.CONTROL.APPS.RELEVANCE.DIALOGS.CONFIRMER.ROOT}`));
				tootConfirmer.listen("MDCDialog:accept", () => {
					app.post("statuses", {
						status: tootContent,
						visibility: appInfo.tootArea
					}).then(() => {
						notify.finish();
						rootBtn.classList.remove(CLASSES.APPS.RUNNING);
					});
				});

				tootConfirmer.listen("MDCDialog:cancel", () => {
					notify.cancel();
					rootBtn.classList.remove(CLASSES.APPS.RUNNING);
				});
		})();


	
	let query = location.querySort();
	
	if (!appInfo.accessToken && !query.CODE) {
		let instances = authForm.querySelector(`#${IDS.AUTH.FORM.INSTANCE.SELECTOR}`);

		for (let server in SERVERS) {
			instances.appendChild(new DOM("Li", {
				text: server,
				classes: ["mdc-list-item"],

				attributes: {
					Role: "Option"
				}
			}));
		}
	}
});
