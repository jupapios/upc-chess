define('util/Element', function () {
	
	Element.implement({
		/**
		 * Setting custom attributes
		 **/
		setData: function (key, value) {
			if ('dataset' in this) {
				this.dataset[key] = value
			} else {
				this.setAttribute('data-' + key, value)
			}
		},

		/**
		 * Getting custom attributes
		 **/
		getData: function (key) {
			return 'dataset' in this ? this.dataset[key] : this.getAttribute('data-' + key)
		},

		hasData: function (key) {
			return 'dataset' in this ? (key in this.dataset) : (typeof this.getAttribute('data-' + key) !== 'undefined')
		},

		getHiddenParent: function () {
			var el = this

			while (el.tagName !== 'BODY') {
				if (el.getStyle('display') === 'none') {
					return el
				}

				el = el.parentNode
			}

			return null
		}
	})
})