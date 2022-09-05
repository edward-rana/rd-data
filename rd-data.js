/*!
 * rd-data JavaScript Library v1.0.0
 *
 * Author: Edward Rana
 * Profile: https://fiverr.com/edwardrana786
 *
 * Copyright: Anyone can use this library for their projects.
 * For modification or selling need author's permission.
 *
 * Required: jquery js library (jquery-3.6.0 recommended)
 *
 * Date: 2022-09-01
 */

var RESERVED_RD_DATA = {};
var RESERVED_LOADED_RD_FILES = [];
var RESERVED_PROMISED_LOADING = {};

function is_dependencies_loaded(){
    if( typeof $ === 'undefined' ){

        if( typeof jQuery === 'undefined' ){
            log('jQuery needed to use rd-data');
            return false;
        }
        else{
            window['$'] = jQuery;
        }
    }

    return true;
}

function log(str){
	console.log(str);
}

function isJson(str) {
    try{
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function rd_ajax(url, data, callback, args = {}){

    //log(data);

    if( !is_dependencies_loaded() ) return false;
   
    default_args = {
        url: url,
        data: data,
        type: "POST",
        success: function(res, strCode, xhr){
            //log( res );
            callback(res, xhr);
        }
    };

    if( args && typeof args === 'object' ){
        for( obj_key in args ){

            if( obj_key == 'params' ){
                default_args['beforeSend'] = function(xhr){
                    xhr['params'] = args[obj_key];
                }
            }
            else{
                default_args[obj_key] = args[obj_key];
            }   
        }
    }

    //log( default_args );

    $.ajax(default_args);
}

function rd_generate_key() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function rd_el_replace( old_el, html ){
    $(old_el).replaceWith(html);
}

function extract_rd_parts( html ){

    if( !is_dependencies_loaded() ) return false;

	var p = html.indexOf('<rd-group');
	var l = html.indexOf('</rd-group');

	

	if( p < 0 || l < 0 ) return html;

	//log( html );

	var rd_html = html.substr(p, (l - p + 11) );

	var rem_html = html.substr(l+11);

	var parser = new DOMParser();
	var xml = parser.parseFromString(rd_html, "text/xml");
	//log( xml );

	if( xml.querySelector("parsererror") ){
		log( xml.querySelector("parsererror").innerText );
	}

	var rd_group = xml.querySelector("rd-group");
	//log(rd_group);

	var rd_parts = rd_group.querySelectorAll("rd");
	//log( rd_parts );

	if( rd_group && rd_parts ){
		capture_rd_parts( rd_parts, rd_group.getAttribute("name") );
	}

	return rem_html;
}

function capture_rd_parts( rd_parts, group_name = '' ){
	for(var i=0; i < rd_parts.length; i++ ){
		var rd_part = rd_parts[i];

		//log( rd_part );

		build_rd_codes( rd_part );

		var rd_name = ((group_name)? group_name+'.' : '')+ rd_part.getAttribute("name");

        if( rd_part.querySelectorAll("[rd_attr]").length > 0 ){
            rd_part.querySelectorAll("[rd_attr]").forEach(function(el){
                log(el);
                var attr = el.getAttribute("rd_attr");

                attr = attr.split("=");

                el.setAttribute(attr[0], (attr[1])?attr[1]:"");
                el.removeAttribute("rd_attr");
            });
        }

		RESERVED_RD_DATA[rd_name] = '`'+rd_part.innerHTML+'`';

		log( RESERVED_RD_DATA );		
	}
}

function build_rd_codes( rd_part ){
	var tmp_rd_part = rd_part;

	for( var i=0; i < 500; i++ ){
		if( tmp_rd_part.querySelector("[rd_task]") ){
			tmp_rd_part = tmp_rd_part.querySelector("[rd_task]");

			//log( tmp_rd_part );
		}
		else if( rd_part.hasAttribute("rd_task") || rd_part.querySelector("[rd_task]") ){

			var codes = build_rd_task( tmp_rd_part );

		    //log( codes );

			tmp_rd_part.innerHTML = codes;

			tmp_rd_part = rd_part;
		}
		else{
			break;
		}
	}
}

function build_rd_task( e ){
	
	var translated_content = e.innerHTML.replaceAll(/<\!--([\W\w]*?)-->/g, '');

	//log(translated_content);

	translated_content = translated_content.replaceAll('{{', '`+ ');
    translated_content = translated_content.replaceAll('}}', ' +`');

    var codes = '`+ function(){ var rd_str = ""; ';

    var task = e.getAttribute('rd_task');

    var args_data = ( e.getAttribute("data") )? e.getAttribute("data") : 'reserved_rd_data';

    args_data = (isJson(args_data))? JSON.stringify(args_data): args_data;

    var var_name = e.getAttribute('var_name');
    var js_code = (e.getAttribute('script'))? e.getAttribute('script'): "";


    if( task == 'render' ){
        codes += ' var '+var_name+' = '+args_data+'; '+js_code+' rd_str += `'+ translated_content +'`;';
    }
    else if( task == 'loop' ){
        codes += ' var rd_loop_data = '+args_data+'; if( rd_loop_data ){ for(var key in rd_loop_data){ var '+ var_name +' = rd_loop_data[key]; '+js_code+' rd_str += `'+translated_content+'`; } }';
    }
    else if( task == 'ajax' ){
        var key = rd_generate_key();

        if(isJson(args_data)){
        	args_data = JSON.parse(args_data);
        }

        var default_args = {processData: true, contentType: "application/x-www-form-urlencoded", type: "POST", async: true};

        if( args_data ){
	        for( obj_key in default_args ){
	            if( args_data.hasOwnProperty(obj_key) ){
	                default_args[obj_key] = args_data[obj_key];
	            }
	        }
	    }

        default_args = JSON.stringify( default_args );

        codes += 'rd_str += `<div rdk="'+key+'"></div>`; var args_data = '+args_data+'; rd_ajax(args_data.url, args_data.post_data, function(res){ log(res); res = (isJson(res))?JSON.parse(res):{}; log(res); var '+var_name+' = res; '+js_code+' var translated_content = `'+translated_content+'`; rd_el_replace( document.querySelector("[rdk=\''+key+'\']"), translated_content ); }, '+default_args+');';
    }

    e.removeAttribute('rd_task');
    e.removeAttribute('data');
    e.removeAttribute('var_name');

    codes += ' return rd_str; }() +`';

    return codes;
}

function load_rd_parts_from_server( rd_parts_file, async = true, promise_key = '' ){

    if( RESERVED_LOADED_RD_FILES.includes(rd_parts_file) ){
        return false;
    }

    var url = rd_parts_file;

    RESERVED_LOADED_RD_FILES.push( url );

    rd_ajax(url, '', function(res, xhr){
        //log( xhr );
        //log(res);

        if( xhr.params.promise_key ){
            RESERVED_PROMISED_LOADING[xhr.params.promise_key]--;
        }

        if( xhr.status == 200 && res ){
            var rem_html = extract_rd_parts( res );

            if( rem_html ){
                rem_html = rem_html.trim();
                //log(rem_html);
            	document.querySelector("body").innerHTML += rem_html;
            }
        }
        else{
            log( res );
        }

        //log( RESERVED_RD_DATA );

    }, {async: async, params : {promise_key: promise_key}});

    return true;
}

function load_rd_parts( rd_parts_files, prepend_path = '', async = true ){

    var promise_key = rd_generate_key();

    if( typeof rd_parts_files === 'string' ){
        rd_parts_files = prepend_path + rd_parts_files;

        if( load_rd_parts_from_server(rd_parts_files, async, promise_key) ){
            RESERVED_PROMISED_LOADING[promise_key] = 1;
        }
    }
    else{
        
        for( var i in rd_parts_files ){
            var rd_parts_file = prepend_path + rd_parts_files[i];
            if( load_rd_parts_from_server(rd_parts_file, async, promise_key) ){
                RESERVED_PROMISED_LOADING[promise_key] = rd_parts_files.length;
            }
        }
    }

    return new Promise(function(resolve, reject){
        var string = '';
        var intrvl = setInterval(function(){

            if( RESERVED_PROMISED_LOADING[promise_key] < 1 ){
                log("Promise resolved for: '"+promise_key+"'");
                delete RESERVED_PROMISED_LOADING[promise_key];
                log( RESERVED_PROMISED_LOADING );
           
                if( !RESERVED_PROMISED_LOADING.keys ){

                    var rd_exports = document.querySelectorAll("rd-export");

                    rd_exports.forEach(function(e){
                        if( e.getAttribute("name") && e.getAttribute("data") ){
                            rd_el_replace(e, get_rd( e.getAttribute("name"), JSON.parse( e.getAttribute("data") ) ) );
                        }  
                    });
                }

                resolve();
                clearInterval( intrvl );
            }
        }, 1);
    });
}

function get_rd( name, reserved_rd_data = '' ){

	if( !RESERVED_RD_DATA[name] ){

        log("rd part not found for '"+name+"'");
	}

    return eval(RESERVED_RD_DATA[name]);
}
