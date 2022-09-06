# rd-data Javascript Libary
## Info
This javascript library is used to render dynamic content from rd-part file with dynamic data.
The codes in rd-file same as html data structure and can render its content inline javascript code and rd tasks.

## Advantage
There are following advantages to use this libaray
- Same as html structure
- There are in-built tasks are added in library - render, loop, ajax
- Render dynamic data in html with inline javascript code and rd tasks.

## Usage
- Required jQuery javascript library to use at this time.
- Depending on jquery will be removed soon.

- To load rd-parts from server ( Library using jquery ajax request to the server for file )
- If a rd-parts-file can access from site url 'https://example.com/rd-parts/rd-file1.php'
  or multiple files 'https://example.com/rd-parts/rd-file2.php', 'https://example.com/rd-parts/rd-file3.php'.
  
  #### There are methods to load those files
 - For single file loading
  ```
  load_rd_parts('https://example.com/rd-parts/rd-file1').then(){
      console.log("rd-parts Loaded..");
  };
  ```
  #### OR
  ```
  load_rd_parts('rd-file1', 'https://example.com/rd-parts/').then(){
      console.log("rd-parts Loaded..");
  };
  ```
  
  
  - For multiple file loading
  
  ```
  load_rd_parts(['rd-file1', 'rd-file2', 'rd-file3'], 'https://example.com/rd-parts/').then(){
      console.log("rd-parts Loaded..");
  };
  ```
  ## Example code structures for rd-parts-file
  
  ```
  <rd-group name="list">

	<rd name="items" rd_task="loop" var_name="item">
		<div class="single-item">
			<h1 class="item-title">{{item.title}}</h1>
			<p class="item-title">{{item.info}}</p>

			<div class="item-images" rd_task="loop" data="item.images" var_name="image">
				<div class="single-image">
					<img src="{{image.src}}" alt="{{image.alt}}"/>
				</div>
			</div>

			<div class="item-ratings">
				{{ get_rd('list.single_item_ratings', item.ratings) }}
			</div>
		</div>
	</rd>

	<rd name="single_item_ratings" rd_task="loop" var_name="rating">
		<div class="user-name">Username: {{rating.username}}</div>
		<p class="rating-number">Rating: {{rating.number}}</p>
	</rd>

</rd-group>
```
## Execute dynamic data
To get dynamic content from rd-part use javascript function ``get_rd('rd_part_name', OBJECT/ARRAY)``
#### Here

```
<script>
/*
 * Object/Array should be according to rd-part code perpose
 * For above example code structure data will be..
 * Note: Here using array of 1 length for example
 */

var data = [{
    title: "Item title 1",
    info: "Some info of the item",
    images: [{
    	src: "IMAGE_SRC_LINK_HERE",
    	alt: "Item Image"
    }],

    ratings: [{
    	username: "Edward",
    	rating: 5
    },
    {
    	username: "Rana",
    	rating: 4.8
    }]
}];

var content_items = get_rd('list.items', data);

//Rendering generated dynamic content into body tag
document.querySelector("body").innerHTML( content_items );

</script>
```



