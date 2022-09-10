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

function are_dependencies_loaded(){
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

function log(str, type = 'log'){
    console[type]( str );
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

    if( !are_dependencies_loaded() ) return false;
   
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

function rd_extract_attrs(html, remove_attrs = true){

    var attrs = {};
    var ok_done = false;
    var rd_in_quote = {};

    const in_quote = function(){
        for(var k in rd_in_quote){
            if( rd_in_quote[k] ){
                return true;
            }
        }
        return false;
    };

    for( var j = 0; j < html.length; j++ ){

        if( html[j] == '"' || html[j] == "'" ){
            if( html[j-1] != "\\" ){
                if( !rd_in_quote[html[j]] ){
                    rd_in_quote[html[j]] = true;
                }
                else{
                    rd_in_quote[html[j]] = false;
                }  
            }
        }
        else if( !in_quote() && html[j] == '>' ){
            if( ok_done ){
                break;
            }

            const regex = new RegExp(`(\\S+)\\s*=\\s*([']|["])\\s*([\\W\\w]*?)\\s*\\2`, 'gm');

            while ((m = regex.exec(html.substr(0, j))) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === regex.lastIndex) {
                    regex.lastIndex++;
                }

                attrs[m[1]] = m[3];  
            }

            if( remove_attrs ){

                var pattern = /(name|task|data|var|code)\s*=\s*([']|["])\s*([\W\w]*?)\s*\2/gm;
                html = html.substr(0, j).replace(pattern, '') + html.substr(j);
                ok_done = true;
                j = -1;
                rd_in_quote = {};
            }
            else{
                break;
            }
        }

        //log( rd_in_quote );
    }

    return {attrs: attrs, html: html, tag_close_pos: j+1};
}

function extract_rd_parts( html, file = '' ){
    if( !are_dependencies_loaded() ) return false;

    html = html.replaceAll(/<\!--([\W\w]*?)-->/g, ''); //.replace(/\s+/g, " ");

    //html = html.replaceAll('></', '> </');

    html = html.replaceAll('{{', '`+ ');
    html = html.replaceAll('}}', ' +`');

    var p = html.indexOf('<rd-group ');
    var rd_group_name = '';
    var rem_html = '';

    if( p > -1 ){
        var l = html.indexOf('</rd-group>');

        rem_html = html.substr(l+11);

        html = html.substr(p, (l-p));
        //log( html );

        var attrs = rd_extract_attrs(html);
        html = attrs.html;

        //log( attrs );

        if( attrs.attrs.name ){
            rd_group_name = attrs.attrs.name;
        }

        html = html.substr(attrs.tag_close_pos, l - attrs.tag_close_pos);
    }

    html = html.trim();

    //log( html );

    var rd_parts = html.split('<rd ');
    //log( rd_parts );

    if( rd_parts.length > 0 ){
        for(var i in rd_parts){
            var rd_part = rd_parts[i];
            if( rd_part.indexOf('</rd>') < 0 ) continue;

            tmp_html = extract_rd_part( rd_part, rd_group_name );

            if( !rd_group_name ){
                rem_html = tmp_html;
            }
        }
        return rem_html;
    }

    return '';
}

function extract_rd_part( html, rd_group_name = '' ){
    //log( html );

    var rd_attrs = rd_extract_attrs( html, false );

    if( !rd_attrs.attrs.name ){
        return false;
    }

    //log( rd_attrs );
    var rd_task_counter = -1;
    var rd_task_holder = [];
    var in_rd_opening = true;

    for(var k=0; k < html.length; k++){
        var i = html.indexOf('<rd-');

        if( i > -1 ){

            var attrs = rd_extract_attrs(html.substr(i));

            rd_task_counter++;
            rd_task_holder[rd_task_counter] = {task: "render"};

            html = html.substr(0, i) + attrs.html;
            var tag_close_pos = attrs.tag_close_pos;
            attrs = attrs.attrs;

            //log( attrs );
            var args_data = '""';
            var js_code = '';

            var codes = '`+ function(){ var rd_str = ""; ';

            if( attrs ){
                //codes += ' var '+attrs.var+' = '+args_data+'; '+js_code+' rd_str += `';
                var rd_task = build_rd_task(attrs);
                rd_task_holder[rd_task_counter] = {task: (attrs.task)?attrs.task: "render", params: rd_task.params};
                codes += rd_task.codes;
            }

            html = html.substr(0, i+tag_close_pos) + codes + html.substr(i+tag_close_pos);

            html = html.substr(0, i+1) + html.substr(i+4);

            //log("Condition 1 : *");
        }
        else if( html.indexOf('</rd-') > -1 ){
            i = html.indexOf('</rd-');

            if( in_rd_opening ){
                rd_task_counter = -1;
                in_rd_opening = false;
            }

            //log( rd_task_counter );
            //log( rd_task_holder );

            rd_task_counter++;
            var e_task = rd_task_holder[rd_task_counter].task;
            
            //log(e_task);

            if( e_task == 'render' ){
                html = html.substr(0, i) + '`; return rd_str; }() +`' + '</' + html.substr(i+5);
            }
            else if( e_task == 'loop' ){
                html = html.substr(0, i) + '`; } } return rd_str; }() +`' + '</' + html.substr(i+5);
            }
            else if( e_task == 'ajax' ){
                html = html.substr(0, i) + '`; rd_el_replace( document.querySelector("[rdk=\''+rd_task_holder[rd_task_counter].params.key+'\']"), rd_gen_content ); }, '+rd_task_holder[rd_task_counter].params.default_args+'); return rd_str; }() +`' + '</' + html.substr(i+5);
            }

            //log( html );

            //log("Condition 2 : *");
        }
        else{
            break;
        }
    } //Main loop end..

    var args_data = '""';
    var js_code = '';

    var codes = '`+ function(){ var rd_str = ""; ';

    var rd_task = build_rd_task(rd_attrs.attrs);

    codes += rd_task.codes;

    html = codes + html.substr(rd_attrs.tag_close_pos);

    var ob_key = ((rd_group_name)?rd_group_name+'.'+rd_attrs.attrs.name : rd_attrs.attrs.name);
          
    //log( rd_task_counter );
    var e_task = (rd_attrs.task)?rd_attrs.task: "render";

    i = html.indexOf("</rd>");

    if( e_task == 'render' ){
        RESERVED_RD_DATA[ob_key] = '`' + html.substr(0, i).trim() +'`; return rd_str; }();';
    }
    else if( e_task == 'loop' ){
        RESERVED_RD_DATA[ob_key] = '`' + html.substr(0, i).trim() +'`; } } return rd_str; }();';
    }
    else if( e_task == 'ajax' ){
        RESERVED_RD_DATA[ob_key] = '`' + html.substr(0, i).trim() +'`; rd_el_replace( document.querySelector("[rdk=\''+rd_task.params.key+'\']"), rd_gen_content ); }, '+rd_task.params.default_args+'); return rd_str; }();';
    }

    return html.substr(i+5);

    //log( RESERVED_RD_DATA );
}

function build_rd_task(attrs){
    //log(attrs);
    var args_data = ( attrs.data )? attrs.data : 'reserved_rd_data';

    args_data = (isJson(args_data))? JSON.stringify(args_data): args_data;

    var task = (attrs.task)?attrs.task: 'render';
    var var_name = (attrs.var)?attrs.var: 'data';
    var js_code = (attrs.code)? attrs.code: "";
    var codes = '';
    var params = {};

    if( task == 'render' ){
        codes += ' var '+var_name+' = '+args_data+'; '+js_code+' rd_str += `';
    }
    else if( task == 'loop' ){
        codes += ' var rd_loop_data = '+args_data+'; if( rd_loop_data ){ for(var key in rd_loop_data){ var '+ var_name +' = rd_loop_data[key]; '+js_code+' rd_str += `';
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

        codes += 'rd_str += `<div rdk="'+key+'"></div>`; var args_data = '+args_data+'; rd_ajax(args_data.url, args_data.post_data, function(res){ log(res); res = (isJson(res))?JSON.parse(res):{}; log(res); var '+var_name+' = res; '+js_code+' var rd_gen_content = `';

        params = {default_args: default_args, key: key};
    }

    return {codes: codes, params: params};
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
            var rem_html = extract_rd_parts( res, xhr.params.url );

            if( rem_html ){
                rem_html = rem_html.trim();
                //log(rem_html);
            	//document.querySelector("body").innerHTML += rem_html;
                $("body").append(rem_html);
            }
        }
        else{
            log( res );
        }

        //log( RESERVED_RD_DATA );

    }, {async: async, params : {promise_key: promise_key, url: url}});

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
                //log("Promise resolved for: '"+promise_key+"'");
                delete RESERVED_PROMISED_LOADING[promise_key];
                //log( RESERVED_PROMISED_LOADING );
           
                if( !RESERVED_PROMISED_LOADING.keys ){

                    var rd_renders = document.querySelectorAll("rd-render");

                    rd_renders.forEach(function(e){
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
