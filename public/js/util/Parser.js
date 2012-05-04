define('util/Parser', function () {
	
	return new Class({
		parse: function (node) {

			node = $(node || document)

			node.getElements('[data-widget]').each(function (el) {
				var 
					el = $(el),
					path = 'widget/'+el.get('data-widget'),
					widget = null

				require([path], function (Widget) {
					widget = new Widget(el)
				})
			})

			node.getElements('[data-app]').each(function (el) {
				var 
					el = $(el),
					path = 'app/'+el.get('data-app')+'/presenter',
					app = null


				require([path], function (App) {
					app = new App(el)
				})
			})
		}
	})
})