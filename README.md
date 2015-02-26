# Awesuggest

Awesuggest is a customizable autocomplete widget extending Lea Verou's Awesomplete to combine functionality from Drew Wilson's jQuery AutoSuggest plugin, packaged as a Prototype plugin for older browsers. (Yes, some of us poor souls still need to support IE8 and can't get away from Prototype.)


## Basic Usage

Before you try anything, you need to ensure that Prototype is loaded on the page and then include awesuggest.css and awesuggest.js in your page, via the usual tags:

```html
<link rel="stylesheet" href="awesuggest.css" />
<script src="awesuggest.js"></script>
```

If you do happen to be using a more modern browser, a stylesheet incorporating Awesomplete styles is also available:

```html
<link rel="stylesheet" href="awesomplete.css" />
```

Then you can add an Awesuggest widget by adding the following input tag:

```html
<input class="awesuggest"
       data-list="Ada, Java, JavaScript, Brainfuck, LOLCODE, Node.js, Ruby on Rails" />
```

Add `class="awesuggest"` for it to be automatically processed (you can still specify many options via HTML attributes).
Otherwise you can instantiate with a few lines of JS code, which allow for more customization.

There are many ways to link an input to a list of suggestions.
The simple example above could have also been made with the following markup, which provides a nice native fallback in case the script doesn’t load:

```html
<input class="awesuggest" list="mylist" />
<datalist id="mylist">
	<option>Ada</option>
	<option>Java</option>
	<option>JavaScript</option>
	<option>Brainfuck</option>
	<option>LOLCODE</option>
	<option>Node.js</option>
	<option>Ruby on Rails</option>
</datalist>
```

Or the following, if you don’t want to use a `<datalist>`, or if you don’t want to use IDs (since any selector will work in data-list):

```html
<input class="awesuggest" data-list="#mylist" />
<ul id="mylist">
	<li>Ada</li>
	<li>Java</li>
	<li>JavaScript</li>
	<li>Brainfuck</li>
	<li>LOLCODE</li>
	<li>Node.js</li>
	<li>Ruby on Rails</li>
</ul>
```

There are multiple customizations and properties able to be instantiated within the JS. Libraries and definitions of the properties are available in the Links below.

## License

Awesuggest is released under the MIT License. See [LICENSE][1] file for
details.

## Links

Munged together by Alice Rose, piggybacking off Lea Verou, Drew Wilson and other fantastic contributors.

Awesomplete can be found at <http://leaverou.github.io/awesomplete/>.

AutoSuggest can be found at <https://github.com/drewwilson/AutoSuggest>.

[1]: https://github.com/heldinz/awesuggest/blob/gh-pages/LICENSE
