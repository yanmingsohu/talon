jQuery(function($) {

//
// 菜单在页面上带有 menu_event 属性, 属性值与函数名同名即可绑定菜单的点击行为.
//
var menu_event = {
  file_open       : file_open,
  file_save       : file_save,
  file_save_all   : file_save_all,
  file_close      : file_close,
  file_close_all  : file_close_all,
  file_exit       : file_exit,
  file_config     : file_config,

  edit_undo       : edit_undo,
  edit_redo       : edit_redo,
  edit_comment    : edit_comment,
  edit_toupper    : edit_toupper,
  edit_tolower    : edit_tolower,
  edit_togg_book  : edit_togg_book,
  edit_next_book  : edit_next_book,
  edit_prev_book  : edit_prev_book,
  edit_cut        : edit_cut,
  edit_paste      : edit_paste,
  edit_copy       : edit_copy,
  edit_win_mode   : edit_win_mode,
  edit_unix_mode  : edit_unix_mode,
  edit_goto_line  : edit_goto_line,
  edit_compare    : edit_compare,

  view_inc_font   : view_inc_font,
  view_dec_font   : view_dec_font,
  view_reset_font : view_reset_font,
  view_show_tree  : view_show_tree,
  view_show_out   : view_show_out,
  view_soft_warp  : view_soft_warp,
  view_full_screen: view_full_screen,

  select_all      : select_all,
  select_to_top   : select_to_top,
  select_to_bottom: select_to_bottom,
  select_sil      : select_sil,
  select_single   : select_single,
  select_line     : select_line,
  select_word     : select_word,
  select_beg_word : select_beg_word,
  select_end_word : select_end_word,
  select_beg_line : select_beg_line,
  select_end_line : select_end_line,
  select_above    : select_above,
  select_below    : select_below,

  find_buffer     : find_buffer,
  find_next       : find_next,
  find_prev       : find_prev,
  find_in_proj    : find_in_proj,

  help_about      : help_about,
  help_wiki       : help_wiki,
  help_readme     : help_readme,
  lang_change     : lang_change,
  beautify        : beautify,
};

var K = Keys.Key;
function ck_not_ace(tab) {
  return !(tab && tab.editor && tab.editor.session);
}

var sys_menu = $('.talon_system_menu');
window.talon.load_menu_from(sys_menu, menu_event);

// ===================--------------------------------============== FILE ---- >

function file_open(menu, talon) {
  menu.setHot('Ctrl + o', function() {
    on_open();
  });

  function on_open(ev, tab) {
    var conf = talon.get_config();
    talon.open_fs_selector(function(err, fsid, name, urls) {
      if (!fsid) return;
      talon.open_project(name, fsid, urls, function(err) {
        if (err) return talon.log(err);
      });
    });
  }
  return on_open;
}


function file_close(menu, talon) {
  // menu.setHot('Ctrl + w', on_close);
  function on_close(ev, tab) {
    if (!tab) return;
    tab.emit('off');
  }
  return on_close;
}


function file_close_all(menu, talon) {
  menu.setHot('Ctrl + q', on_call);
  function on_call(ev, tab) {
    talon.emit('close_all_tab');
  }
  return on_call;
}


function file_save(menu, talon) {
  menu.setHot('Ctrl + s', on_save);

  function on_save(ev, tab) {
    if (!tab) return talon.log(talon.lang('x0001'));
    tab.save(function(err, total) {
      if (err) return talon.log(err);
    });
  }
  return on_save;
}


function file_save_all(menu, talon) {
  menu.setHot('Ctrl + Shift + s', function() {
    talon.emit('save_all');
  });
  return function(ev, tab) {
    talon.emit('save_all');
  }
}


function file_exit(menu, talon) {
  return function(ev, curr_tab) {
    var rurl = talon.open_conf.exit_url;
    if (rurl) {
      talon.closeAllFile(function() {
        window.open(rurl, '_self');
      });
    } else if (history.length > 0) {
      talon.closeAllFile(function() {
        history.back();
      });
    } else {
      talon.print(talon.lang('x0002'));
    }
  }
}


function file_config(menu, talon) {
  return function(ev, tab) {
    var cfg = talon.get_config();
    var txt = JSON.stringify(cfg, 0, 2);
    var new_tab = talon.add_code_editor({
      name : 'talon-config.json',
      mode : 'json',
      text : txt,
    });

    new_tab.on('off', function() {
      new_tab.close();
    });

    new_tab.save = function() {
      var ncfg = JSON.parse(new_tab.editor.getValue());
      for (var n in ncfg) {
        cfg[n] = ncfg[n];
      }
      talon.save_config();
      new_tab.resetchange();
    };
  }
}


// ===================--------------------------------============== EDIT ---- >

function edit_undo(menu, talon) {
  menu.setHot('Ctrl + z');
  return function(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.undo();
  }
}


function edit_redo(menu, talon) {
  menu.setHot('Ctrl + y');
  return function(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.redo();
  }
}


function edit_comment(menu, talon) {
  menu.setHot('Ctrl + / ?', toggle_comment);
  function toggle_comment(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.toggleCommentLines();
  }
  return toggle_comment;
}


function edit_toupper(menu, talon) {
  return function to_upper_case(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.toUpperCase();
  }
}


function edit_tolower(menu, talon) {
  return function to_lower_case(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.toLowerCase();
  }
}


function edit_togg_book(menu, talon) {
  menu.setHot('Ctrl + F2', toggle_bookmark);
  function toggle_bookmark(ev, tab) {
    if (ck_not_ace(tab)) return;
    var book = tab._ace_bookmark;
    if (!book) book = tab._ace_bookmark = {};
    var editor = tab.editor;
    var pos = editor.getCursorPosition();
    var isset = tab._ace_bookmark[pos.row];

    if (isset) {
      editor.session.clearBreakpoint(pos.row);
    } else {
      editor.session.setBreakpoint(pos.row, 'bookmark');
    }
    tab._ace_bookmark[pos.row] = !isset;
  }
  return toggle_bookmark;
}


function edit_next_book(menu, talon) {
  menu.setHot('F2', next_book);
  talon.add_ace_skip_cmd('toggleFoldWidget');

  function next_book(ev, tab) {
    if (ck_not_ace(tab)) return;
    var bp = tab.editor.session.getBreakpoints();
    if (!tab._ace_bookmark_index) tab._ace_bookmark_index = 0;
    ++tab._ace_bookmark_index;

    while ((!bp[tab._ace_bookmark_index])
          && tab._ace_bookmark_index < bp.length)
        ++tab._ace_bookmark_index;

    if (tab._ace_bookmark_index >= bp.length) {
      tab._ace_bookmark_index = 0;
      talon.set_state(talon.lang('x0003'));
    } else {
      tab.editor.gotoLine(tab._ace_bookmark_index+1, 0, true);
    }
  }
  return next_book;
}


function edit_prev_book(menu, talon) {
  menu.setHot('Shift + F2', prev_book);

  function prev_book(ev, tab) {
    if (ck_not_ace(tab)) return;
    var bp = tab.editor.session.getBreakpoints();
    if (!tab._ace_bookmark_index) tab._ace_bookmark_index = bp.length;
    --tab._ace_bookmark_index;

    while ((!bp[tab._ace_bookmark_index])
          && tab._ace_bookmark_index >= 0)
        --tab._ace_bookmark_index;

    if (tab._ace_bookmark_index < 0) {
      tab._ace_bookmark_index = bp.length;
      talon.set_state(talon.lang('x0004'));
    } else {
      tab.editor.gotoLine(tab._ace_bookmark_index+1, 0, true);
    }
  }
  return prev_book;
}


function edit_cut(menu, talon) {
  return function cut(ev, tab) {
    if (!tab) return;
    tab.editor.focus();
    document.execCommand('cut');
  }
}


function edit_paste(menu, talon) {
  return function paste(ev, tab) {
    if (!tab) return;
    tab.editor.focus();
    document.execCommand('paste');
  }
}


function edit_copy(menu, talon) {
  return function copy(ev, tab) {
    if (!tab) return;
    tab.editor.focus();
    document.execCommand('copy');
  }
}


function edit_unix_mode(menu, talon) {
  var add = talon.create_mutex('new_line_mode');
  var mutex = add(function() {
    menu.removeClass('selected');
  });
  return function unix_mode(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.session.setNewLineMode('unix');
    menu.addClass('selected');
    mutex.focus();
  }
}


function edit_win_mode(menu, talon) {
  var add = talon.create_mutex('new_line_mode');
  var mutex = add(function() {
    menu.removeClass('selected');
  });
  return function win_mode(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.session.setNewLineMode('windows');
    menu.addClass('selected');
    mutex.focus();
  }
}


function edit_goto_line(menu, talon) {
  function goto_line(ev, tab) {
    if (ck_not_ace(tab)) return;
    var pos = tab.editor.getCursorPosition();
    var opt = { title: talon.lang('x0005'),
      msg : talon.lang('x0006') + ': ' + pos.row + ' '
          + talon.lang('x0007') + ': ' + pos.column };

    talon.open_input(opt, function(err, l) {
      if (err) return talon.log(err);
      var linenum = parseInt(l) - 1;
      if (linenum >= 0) {
        tab.editor.moveCursorTo(linenum);
        tab.editor.clearSelection();
        tab.editor.centerSelection();
      } else {
        talon.log(talon.lang('x0008'));
      }
    });
  }
  return goto_line;
}


function edit_compare(menu, talon) {
  function compare_to(ev, tab) {
    if (ck_not_ace(tab)) return;
    talon.on('tab_changed_focus', onclicktab);
    var dia = $('.talon_compare_dialog').clone().appendTo(document.body);
    dia.screen_center();

    dia.find('.cancel').click(close);
    talon.on('esc_key_press', close);
    talon.on('once_click_anything', close);

    function close() {
      talon.off('tab_changed_focus', onclicktab);
      talon.off('esc_key_press', close);
      dia.remove();
    }

    function onclicktab(targettab) {
      talon.create_diff({
        file1Name : targettab.full_name,
        file2Name : tab.full_name,
        tab       : targettab,
        get_file  : function(cb) { cb(tab.editor.getValue(), 0); },
        update    : function() {},
      });
      close();
    }
  }
  return compare_to;
}


// ===================--------------------------------============ SELECT ---- >

function select_all(menu, talon) {
  menu.setHot('Ctrl + a');
  return function _all(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.selectAll();
    tab.editor.focus();
  }
}


function select_to_top(menu, talon) {
  return function _to_top(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.getSelection().selectFileStart();
    tab.editor.focus();
  }
}


function select_to_bottom(menu, talon) {
  return function _to_bottom(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.getSelection().selectFileEnd();
    tab.editor.focus();
  }
}


function select_sil(menu, talon) {
  return function split_into_lines(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.getSelection().splitIntoLines();
    tab.editor.focus();
  }
}


function select_single(menu, talon) {
  menu.setHot('Esc', signle_select);
  function signle_select(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.getSelection().clearSelection();
    tab.editor.exitMultiSelectMode();
    tab.editor.focus();
  }
  return signle_select;
}


function select_line(menu, talon) {
  function line(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.getSelection().selectLine();
    tab.editor.focus();
  }
  return line;
}


function select_word(menu, talon) {
  function word(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.getSelection().selectWord();
    tab.editor.focus();
  }
  return word;
}


function select_beg_word(menu, talon) {
  function begin_word(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.getSelection().selectWordLeft();
    tab.editor.focus();
  }
  return begin_word;
}


function select_end_word(menu, talon) {
  function end_word(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.getSelection().selectWordRight();
    tab.editor.focus();
  }
  return end_word;
}


function select_beg_line(menu, talon) {
  menu.setHot('Shift + home');
  function begin_line(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.getSelection().selectLineStart();
    tab.editor.focus();
  }
  return begin_line;
}


function select_end_line(menu, talon) {
  menu.setHot('Shift + end');
  function end_line(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.getSelection().selectLineEnd();
    tab.editor.focus();
  }
  return end_line;
}


function select_above(menu, talon) {
  menu.setHot('Ctrl + Alt + &uarr;');
  function above(ev, tab) {
    if (ck_not_ace(tab)) return;
    var pos   = tab.editor.getCursorPosition();
    var range = new (ace.require('./range').Range)
        (pos.row-1, pos.column, pos.row-1, pos.column);
    tab.editor.getSelection().addRange(range);
    tab.editor.focus();
  }
  return above;
}


function select_below(menu, talon) {
  menu.setHot('Ctrl + Alt + &darr;');
  function below(ev, tab) {
    if (ck_not_ace(tab)) return;
    var pos   = tab.editor.getCursorPosition();
    var range = new (ace.require('./range').Range)
        (pos.row+1, pos.column, pos.row+1, pos.column);
    tab.editor.getSelection().addRange(range);
    tab.editor.focus();
  }
  return below;
}


// ===================--------------------------------============== VIEW ---- >

function view_inc_font(menu, talon) {
  menu.setHot('Ctrl + Shift + =');
  talon.key_binding.add('view_inc_font',
      new Keys.Combo(K['= +'], [K.SHIFT, K.CTRL]));
  talon.key_binding.registerHandler('view_inc_font', function() {
    inc(null, talon.get_current_tab());
  }, true);

  function inc(ev, tab) {
    if (ck_not_ace(tab)) return;
    var editor = tab.editor;
    if (editor && editor.setFontSize) {
      var fs = editor.getFontSize() + 1;
      editor.setFontSize(fs);
      talon.get_config().font_size = fs;
      talon.set_state(talon.lang('x0009') + ': ' + fs);
    }
  }
  return inc;
}


function view_dec_font(menu, talon) {
  menu.setHot('Ctrl + Shift + -');
  talon.key_binding.add('view_dec_font',
      new Keys.Combo(K['- _'], [K.SHIFT, K.CTRL]));
  talon.key_binding.registerHandler('view_dec_font', function() {
    dec(null, talon.get_current_tab());
  }, true);

  function dec(ev, tab) {
    if (ck_not_ace(tab)) return;
    var editor = tab.editor;
    if (editor && editor.setFontSize) {
      var fs = editor.getFontSize() - 1;
      editor.setFontSize(fs);
      talon.get_config().font_size = fs;
      talon.set_state(talon.lang('x0009') + ': ' + fs);
    }
  }
  return dec;
}


function view_reset_font(menu, talon) {
  var default_fontsize = 12;
  return function(ev, tab) {
    if (ck_not_ace(tab)) return;
    var editor = tab.editor;
    editor.setFontSize(default_fontsize);
    talon.get_config().font_size = default_fontsize;
    talon.set_state(talon.lang('x0009') + ': ' + default_fontsize);
  }
}


function view_show_tree(menu, talon) {
  var tree = talon.get_tree_dom();
  menu.setHot('F8', toggle);

  function toggle() {
    if (tree.css('display') == 'none') tree.show();
    else tree.hide();
    talon.emit('working_resize');
  }
  return toggle;
}


function view_show_out(menu, talon) {
  menu.setHot('F9');
  return function tog(ev, tab) {
    talon.toggle_output();
  }
}


function view_soft_warp(menu, talon) {
  return function toggle_soft_warp(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab._wrap_mode = !tab._wrap_mode;
    tab.editor.session.setUseWrapMode(tab._wrap_mode);
  }
}


function view_full_screen(menu, talon) {
  menu.setHot('F11');
  var element = document.body;
  var isfull = document.webkitIsFullScreen
            || document.mozIsFullScreen
            || document.msIsFullScreen
            || document.isFullScreen;

  function _exit() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozExitFullScreen) {
      document.mozExitFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  function _full() {
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }

  function full_screen(ev, tab) {
    if (isfull) _exit();
    else _full();
    isfull = !isfull;
  }
  return full_screen;
}


// ===================--------------------------------============== FIND ---- >

function find_buffer(menu, talon) {
  menu.setHot('Ctrl + f', _find_in_buffer);
  talon.add_ace_skip_cmd('find');

  function _find_in_buffer(ev, tab) {
    if (ck_not_ace(tab)) return;

    var txt = tab.editor.getCopyText();
    if (txt) $('.talon_find_file .find_txt').val(txt);

    if (tab.find_window_opened) return;
    tab.find_window_opened = true;

    var ff = talon.open_find_file(tab);

    ff.on('find', function(opt, word) {
      var c = tab.editor.find(word, opt);
      if (!c) ff.setCount(0, talon.lang('x0010') + ' "' + word + '"');
    });
    ff.on('find_all', function(opt, word) {
      ff.setCount( tab.editor.findAll(word, opt, true) );
    });

    ff.on('replace', function(opt, word, repl) {
      tab.editor.replace(repl);
    });
    ff.on('replace_all', function(opt, word, repl) {
      var c = tab.editor.replaceAll(repl);
      ff.setCount(0, c + ' ' + talon.lang('x0011'));
    });
  }
  return _find_in_buffer;
}


function find_next(menu, talon) {
  menu.setHot('F3', _find_next);
  function _find_next(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.findNext();
  }
  return _find_next;
}


function find_prev(menu, talon) {
  menu.setHot('Shift + F3', _find_prev);
  function _find_prev(ev, tab) {
    if (ck_not_ace(tab)) return;
    tab.editor.findPrevious();
  }
  return _find_prev;
}


function find_in_proj(menu, talon) {
  var project, node;
  menu.disable();

  talon.on('choose_project', function (_project, _node) {
    if (_project && _node) {
      menu.enable();
    } else {
      menu.disable();
    }
    node = _node;
    project = _project;
  });

  return function _find_in_project(ev, tab) {
    if (!project) throw new Error(talon.lang('x0012'));

    var opt = {
      title : talon.lang('x0013'),
      msg   : talon.lang('x0014'),
    };

    talon.open_input(opt, function(err, txt) {
      if (!(txt && txt.length >= 3))
        throw new Error(talon.lang('x0015'));

      var url = talon.get_config().service_url.find_in_file;
      if (!url)
        throw new Error(talon.lang('x0016'));

      var over = talon.open_loading();
      var param = { fsid: node.tal_fsid, path: '/', find: txt };

      talon.ajax(url, param, function(err, ret) {
        over();
        if (err) return talon.log(err);
        when_get_find_res(ret, txt);
      });
    });

    function open_file_handle(name, line, txt) {
      return function(ev) {
        project.find_node(name, function(err, fnid, fnode) {
          if (err) log(err);
          if (!fnode) return;
          project.open_file(ev, fnid, fnode, function (tab, _node) {
            if (ck_not_ace(tab)) return;
            tab.editor.moveCursorTo(parseInt(line), 0);
            tab.editor.find(txt);
            tab.editor.focus();
            setTimeout(function() {
              tab.editor.centerSelection();
            });
          });
        });
        return false;
      }
    }

    function when_get_find_res(ret, txt) {
      var title = 'FIND ' + txt;
      if (title.length > 10) title.substr(0, 10) + '...';

      var new_tab = talon.add_tab(title);
      var frame = $(new_tab.get_content()).css({'display': 'flex', 'flex':1 });
      var list = $('<div/>').appendTo(frame).addClass('talon_find_file_list');

      list.append('<h3>Find "'+ txt+ '" in '+ ret.data.length+ ' files:</h3>');

      ret.data.forEach(function(line) {
        var name = line[0];
        var lc = line[1];
        list.append($('<div class="filename"></div>').text(name));

        for (var l in lc) {
          l = Number(l);
          var a = $('<a class="line" href="#"/>').text('(' + (l+1) + ') ' + lc[l]);
          a.appendTo(list).click(open_file_handle(name, l, txt));
        }
      });

      if (ret.skip.length > 0) {
        list.append('<h3>Skip find files:</h3>');
        ret.skip.forEach(function(skip) {
          list.append('<div>' + skip[0]
            + '<span class="error">' + skip[1] + '</span></div>');
        });
      }

      new_tab.on('off', function() {
        new_tab.close();
      });
    }
  }
}


// ===================--------------------------------============== HELP ---- >


function beautify(menu, talon) {
  var type = menu.attr('type');
  var set = {
    html : {
      path : 'index-lib/beautify-html.js',
      fnn  : 'html_beautify',
    },
    css : {
      path : 'index-lib/beautify-css.js',
      fnn  : 'css_beautify',
    },
    js : {
      path : 'index-lib/beautify.js',
      fnn  : 'js_beautify',
    }
  }[type];

  var opt = {
    indent_size : talon.get_config().tab_size || 2,
    wrap_line_length : 80,
    space_before_conditional: true,
    end_with_newline: true,
    break_chained_methods: true,
    keep_array_indentation: true,
  };

  return function (ev, tab) {
    if (ck_not_ace(tab)) return;

    $.loadScript(set.path, function() {
      var _beautify = window[set.fnn];
      var bcode = _beautify(tab.editor.getValue(), opt);
      tab.editor.setValue(bcode);
    });
  }
}


function lang_change(menu, talon) {
  var code = menu.attr('code');
  if (code == talon.get_config().language_code) {
    menu.addClass('selected');
  }

  var add = talon.create_mutex('new_line_mode');
  var mutex = add(function() {
    menu.removeClass('selected');
  });

  return function() {
    talon.change_lang(code, function(err) {
      if (err) talon.log(talon.lang('x0018'), err);
      else talon.log(talon.lang('x0017'), code);
      mutex.focus();
      menu.addClass('selected');
    });
  }
}


function help_wiki() {
  return function() {
    window.open('/cat/wiki-entry/index.html');
  }
}


function help_about(menu, talon) {
  return function() {
    $('.talon_welcome').screen_center();
  }
}


function help_readme(menu, talon) {
  var fname = 'README.md';

  return function(ev, curr_tab) {
    $.get(fname, function(txt) {
      var new_tab = talon.add_code_editor({
        name : fname,
        mode : 'markdown',
        text : txt,
      });

      new_tab.on('off', function() {
        new_tab.close();
      });
    });
  }
}


});
