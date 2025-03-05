/**
 * Created by manhdung on 7/28/16.
 */
//notificationFx
var hold_call = false;
var notice_callout;
var display_callout = false;

var notification_income;
var total_popup_income = 0;


var income_call_arr = Array();

//sip
var session;

var ua;
var call_status;


jQuery(function() {
    ua_register();
});

function ua_register(){

    if(phone_type == 'webcall'){
        ua = new SIP.UA({
            uri: auth_user + '@' + ast_host,
            wsServers: ['wss://' + ast_host + ':' + ast_port + '/ws'],
            authorizationUser: auth_user,
            password: auth_pass,
            displayName: display_val,
            register: true,
            userAgentString: "WebCall.vn/1.0",
            hackIpInContact: true,
            hackWssInTransport: true,
            rel100: "supported"
        });

        ua.on('invite', function (s) {
            voiceNotificationLib.soundPlay();

            call_status = 'income';
            var phone = s.request.getHeader('X-caller-num');
            var name = s.request.getHeader('X-caller-name');
            var path = s.request.getHeader('X-landing-page');
            var uniqueid = s.request.getHeader('X-uniqueid');

            voiceNotificationLib.tooltop_income_call(phone, name, path, uniqueid);

            useSession(s);

        });
    }

    // voiceNotificationLib.open_notification_callout();
}

function useSession(s) {

    session = s;
    // by far end hangup after conversation
    session.on('bye', function () {
        //alert("bye bye:"+s.remoteIdentity.uri);
        voiceNotificationLib.soundPause();
        voiceNotificationLib.tooltip_close();
    });

    // far end hangup after sending call invite
    session.on('cancel', function () {
        //alert("Miss call from ... "+ s.remoteIdentity.uri);
        voiceNotificationLib.soundPause();
        voiceNotificationLib.tooltip_close();
    });

    session.on('accepted', function () {
        // alert("test1 ");
        jQuery("#btn_hold_call").removeClass('disabled');
        jQuery("#btn_transfer_call").removeClass('disabled');
        jQuery("#btn_dtmf").removeClass('disabled');
    });

    /*session.on('refer', function() {
     alert('refer income');
     });*/

}

function make_answer(){
    voiceNotificationLib.soundPause();
    call_status = 'answer';
    session.accept({
        media: {
            constraints: {
                audio: true,
                video: false
            },
            render: {
                remote: [
                    document.createElement('audio')
                ]
            }
        }
    });
}

function end_call(){
    session.bye();
}

function make_cancel(){
    voiceNotificationLib.soundPause();
    session.cancel();
    call_status = '';
}

function make_hangup(){
    voiceNotificationLib.soundPause();
    session.reject();
    call_status = '';
}

function transfer(dest_ext){
    var ext = dest_ext;
    var option = {
        extraHeaders: ['transfer_num:'+ext]
    }
    session.refer(ext, option);
}

function hold(){
    session.hold();
}

function unhold(){
    var test = session.unhold();
}

function dtmf(num){
    session.dtmf(num);
}

function make_to_call_webcall(phone_num, calltype, ticketCode, callingCode, crm_ticket_id){
    var dest = phone_num;
    if(calltype == 'internal'){
        dest = "SIP/"+phone_num;
    }

    var hotline = '';
    var prefix = '';
    if(calltype == 'outgoing'){
        hotline = hotline_num;
        prefix = hotline_prefix;
    }
    var callee_name = "";
    
    if(navigator.userAgent.indexOf("Chrome") != -1 || navigator.userAgent.indexOf("Opera") != -1 || navigator.userAgent.indexOf("Firefox") != -1 )
    {
        session = ua.invite(calltype, {
            media: {
                constraints: {
                    audio: true,
                    video: false
                },
                render: {
                    remote: [
                        document.createElement('audio')
                    ]
                }
            },
            extraHeaders: ['extension:'+auth_user,'merchant_code:'+merchant_id, "destination: "+dest,'caller_name:'+full_name, 'caller_num:'+auth_user, 'callee_name:'+callee_name, 'landing_page:webcall.vn', 'outboundCID:'+hotline, 'prefix:'+prefix , 'ticket_code:'+ticketCode, 'callingCode:'+callingCode, 'crm_ticket_id:' + crm_ticket_id]
        });

        voiceNotificationLib.soundPlay();
        voiceNotificationLib.dial_show_end_call();

        // End call due to far end fail
        session.on('failed', function (request) {
            console.log('==== outgoing failed');
            voiceNotificationLib.soundPause();
            //jQuery("#group_btn_call").remove();
            voiceNotificationLib.tooltip_close();
        });

        // End call when far end conversation
        session.on('bye', function () {
            //console.log('==== outgoing bye bye');
            voiceNotificationLib.soundPause();
            //jQuery("#group_btn_call").remove();
            voiceNotificationLib.tooltip_close();

        });

        session.on('accepted', function () {
            //console.log('==== outgoing accepted call');
            voiceNotificationLib.soundPause();

            jQuery("#btn_end_call").removeClass('hide');
            jQuery("#btn_cancel").addClass('hide');

            jQuery(".btn_answer_income_call").removeClass('hide');
            jQuery(".btn_income_call").addClass('hide');

            jQuery("#btn_hold_call").removeClass('disabled');
            jQuery("#btn_transfer_call").removeClass('disabled');
            jQuery("#btn_dtmf").removeClass('disabled');

        });

        session.on('refer', function() {
            //alert('make refer');
        });

        session.on('progress', function (response) {
            
            voiceNotificationLib.soundPause();
            jQuery("#btn_end_call").addClass('hide');
            jQuery("#btn_cancel").removeClass('hide');

            if (response.status_code === 183 && response.body && session.hasOffer && !session.dialog) {
                if (!response.hasHeader('require') || response.getHeader('require').indexOf('100rel') === -1) {
                    session.mediaHandler.setDescription(response).then(function onSuccess () {
                        session.status = SIP.Session.C.STATUS_EARLY_MEDIA;
                        session.mute();
                    }, function onFailure (e) {
                        session.logger.warn(e);
                        session.acceptAndTerminate(response, 488, 'Not Acceptable Here');
                        session.failed(response, SIP.C.causes.BAD_MEDIA_DESCRIPTION);
                    });
                }
            }
        });

    } else
    {
        alert('Just run on Firefox, Chrome && Opera');
    }
}

function unregister_wc(){
    if(typeof ua !== 'undefined') ua.unregister();
}

var voiceNotificationLib = {

    open_notification_callout: function () {
        if (display_callout == false) {
            webcallApi.doAjax({
                type: "GET",
                url: '/voice_ajax/notification_callout',
                success: function (html) {
                    // create the notification
                    notice_callout = new NotificationFx({
                        message: html,
                        layout: 'attached',
                        effect: 'flip',
                        type: 'notice', // notice, warning or error
                        onClose: function () {
                            display_callout = false;
                        },
                        onOpen: function () {
                            display_callout = true;

                        },
                        wrapper: document.getElementsByClassName('sidebar-content')[0],
                    });
                    // show the notification
                    notice_callout.show();

                    if (total_popup_income == 0) {
                        jQuery(".ns-close").hide();
                    } else {
                        jQuery(".ns-close").show();
                    }

                }
            });
            display_callout = true;

        }

        if (total_popup_income == 0) {
            jQuery(".ns-close").hide();
        } else {
            jQuery(".ns-close").show();
        }
    },

    close_notification_callout: function () {
        display_callout = false;
        notice_callout.dismiss();
    },

    load_callout_form: function(){
        // webcallApi.doAjax({
        //     type: "GET",
        //     url: '/voice_ajax/notification_callout',
        //     success: function (html) {
        //         jQuery("#notification_call_panel").html(html);
        //     }
        // });
        jQuery("#customer-output").hide();
        jQuery("#call-input").show();
        voiceNotificationLib.postbackParent('end');
    },

    soundPlay: function () {
        // jQuery('#sound_income_call')[0].play();
    },

    soundPause: function () {
        jQuery('#sound_income_call')[0].pause();
    },

    tooltop_income_call: function (phone, fullname, path, uniqueid) {

        jQuery("#icon_call").removeClass('call-dialog');

        jQuery("#panel_dial").addClass('hide');
        jQuery("#panel_income_call").removeClass('hide');

        jQuery(".btn_income_call").removeClass('hide');
        jQuery(".btn_answer_income_call").addClass('hide');

        this.receive_income_call('in', phone, fullname, uniqueid);

        webcallNotify.calling(phone);
    },

    receive_income_call: function (frm_act, dest_num, dest_name, uniqueid) {
        var self = this;
        var cus_phone = dest_num;
        var cus_name = dest_name;
        var path = '';

        var data = {
            act: frm_act,
            fullname: cus_name,
            phone: cus_phone,
            source_path: path,
            cdr_uniqueid: uniqueid,
            height: total_popup_income,
            app: 'call',
            merchant_id: merchant_id
        };
        webcallApi.doAjax({
            type: "GET",
            url: "https://call.flyfonetalk.com/call/voice/get_customer",
            data: data,
            dataType: "json",
            //async: false,
            success: function (data) {
                if(data.status == true){

                    var customer = data.data;
                    var cus_phone_text = show_customer_phone == "n" ? censorPhone(cus_phone, 5) : cus_phone;
                    jQuery("#customer-output .customer-phone").text(cus_phone_text);
                    jQuery("#call-input #callphone").val(cus_phone_text);
                    if(customer != null){
                        jQuery("#customer-output .customer-name").text(customer.customer_name);
                        jQuery("#customer-output .customer-note").html(customer.customer_note);

                        var cus_phone_text = show_customer_phone == "n" ? censorPhone(customer.customer_phone, 5) : customer.customer_phone;
                        jQuery("#customer-output .customer-phone").text(cus_phone_text);
                        jQuery("#call-input #callphone").val(cus_phone_text);
                        if(customer.open_link != ""){
                            jQuery("#customer-output .customer-link").attr("onclick", "voiceNotificationLib.openLink('" + customer.app_id + "', '" + customer.customer_name + "')");
                            jQuery("#customer-output .customer-link").show();
                        }
                    }

                    jQuery("#customer-output").show();
                    jQuery("#call-input").hide();
                    if(frm_act == 'in'){
                        ua_register();
                        jQuery("#btn_answer_call").removeClass('hide');
                        jQuery("#customer-output .customer-title").text("Gá»ŒI VÃ€O");
                        jQuery("#btn_answer_call").attr("onclick", "voiceNotificationLib.make_answer_income_call('" + customer.customer_phone + "', '" + uniqueid + "')");

                        jQuery("#btn_cancel").addClass("hide");
                        jQuery("#btn_hangup_call").removeClass("hide");

                    } else {
                        jQuery("#customer-output .customer-title").text("Gá»ŒI RA");
                        jQuery("#btn_answer_call").addClass('hide');

                        jQuery("#btn_view").removeClass('width32');
                        jQuery("#btn_view").addClass('width50');
                        jQuery("#btn_cancel").removeClass('width32');
                        jQuery("#btn_cancel").addClass('width50');
                    }
                }

            }
        });
    },

    openLink: function (id, name) {
        parent.postMessage([id, name], "*");
    },

    load_customer: function (dest_num, uniqueid) {
        var cus_phone = dest_num;

        webcallApi.doAjax({
            type: "POST",
            url: '/call/voice/load_customer',
            data: {
                phone: cus_phone,
                cdr_uniqueid: uniqueid,
                merchant_id: merchant_id
            },
            success: function (html) {
                jQuery("#customer-output").html(html).show();
                jQuery("#call-input").hide();

            }
        });
    },

    back_to_pad: function (obj) {
        jQuery("#customer-output").hide();
        jQuery("#call-input").show();
    },

    dial_make_a_call: function(phone, contact_name, calltype, ticket_code, crm_ticket_id) {
        var callingCode = callCode + phone;
        var self = this;

        if (crm_ticket_id === undefined){
            crm_ticket_id = '0';
        }

        var callout_status = true;
        ticket_code = jQuery("input[name=notification_call_panel_tc]").val();
        phone = phone.replace(/\D/g, '');
        if(phone == '' ){
            alert("You need to enter a phone number to make a call.");
        }
        else if(/^[0-9]*$/gm.test(phone) == false){
            alert("You need to enter a phone number to make a call.");
        }
        else {
            if(calltype == 'outgoing'){
                if(permission_callout == "n"){
                    alert("Sorry! You do not have permission for this action.");
                    return;
                }
            }

            if(calltype == 'internal'){
                webcallApi.doAjax({
                    type: "GET",
                    url: "/api/voice/check_extension_status.json?ext="+phone,
                    dataType: "json",
                    async: false,
                    success: function(data){
                        if(data != null){
                            if(data.status != "Online"){
                                callout_status = false;
                            }
                        }
                    }
                });
            }

            if(callout_status){
                if(phone_type =='webcall'){
                    jQuery(".btn_answer_income_call").removeClass('hide');
                    jQuery(".btn_income_call").addClass('hide');
                    self.receive_income_call('out', phone, contact_name, ticket_code);
                    make_to_call_webcall(phone, calltype, ticket_code, callingCode, crm_ticket_id);
                } else {  //check sip online
                    webcallApi.doAjax({
                        type: "GET",
                        url:  '/voice_ajax/online_sip_check',
                        data: {
                            ext: extension
                        },
                        success: function(output){
                            if(output != null && output == 'online'){
                                self.make_call_by_sip(phone, contact_name);
                                self.load_customer(phone, ticket_code);
                                alert("The call is being transferred to your SIP phone.");
                            } else {
                                alert("Your SIP account is offline. Please check again or switch to WebPhone mode to make a call.");
                            }
                        }
                    });
                }
            } else {
                if(calltype != 'outgoing'){
                    alert("The recipient is currently busy or unavailable. Please try again later.");
                }

            }
        }
    },

    make_call_by_sip:function(phone, contact_name){
        webcallApi.doAjax({
            type: "GET",
            url:  '/api/voice/make_call?phone='+phone+'&name='+contact_name,
            beforeSend: function(){
                // bootbox.alert("ChÃº Ã½: cuá»™c gá»i Ä‘ang Ä‘Æ°á»£c káº¿t ná»‘i Ä‘áº¿n á»©ng dá»¥ng iWebCall trÃªn Ä‘iá»‡n thoáº¡i!");
            },
            success: function(output){

            }
        });
    },

    tooltip_close: function() {
        this.load_callout_form();
    },

    close_notification: function () {
        if(notification_income){
            notification_income.dismiss();
        }
    },

    dial_show_end_call: function() {
        //console.log('==== show call cancel');

        jQuery("#btn_answer_call").addClass('hide');
        //jQuery("#btn_make_call").addClass('hide');
        jQuery("#btn_end_call").addClass('hide');
        jQuery("#btn_cancel").removeClass('hide');
    },

    enterToCall: function(e, callphone) {
        var key;
        var keychar;

        if (window.event)
            key = window.event.keyCode;
        else if (e)
            key = e.which;
        else
            return true;
        keychar = String.fromCharCode(key);

        // control keys
        if ( (key == 13)) {
            var call_status = this.dial_make_a_call(callphone, '', 'outgoing');
            if (call_status) {
                //load_ajax_url(base_url + 'working/customer/nav_quick_search?act=income_call&search_key=' + callphone + '&ticket_code=' + ticket_code, 'page-content');
            }

            return true;
        } else if((key == null) || (key == 0) || (key == 8) || (key == 9) || (key == 99) || (key == 118) || (key == 120) || (key == 97)){
            return true;
        } else if ((("0123456789").indexOf(keychar) > -1)) // numbers
            return true;
        else
            return false;

    },

    income_end_call: function() {
        voiceNotificationLib.postbackParent('end');
        end_call();
        this.tooltip_close();
        jQuery("#btn_hold_call, #btn_transfer_call").addClass("disabled");
        // jQuery('.modal').modal('hide');
    },

    income_hangup_call: function() {
        make_hangup();
        this.tooltip_close();
        // jQuery('.modal').modal('hide');
    },

    income_hold_call: function() {
        hold();
        jQuery("#btn_hold_call").addClass('hide');
        jQuery("#btn_resume_call").removeClass('hide');
        hold_call = true;
    },

    income_unhold_call: function() {
        unhold();
        jQuery("#btn_resume_call").addClass('hide');
        jQuery("#btn_hold_call").removeClass('hide');
        hold_call = false;
    },

    dial_make_cancel: function() {
        voiceNotificationLib.postbackParent('cancel');
        make_cancel();
        this.tooltip_close();
        // jQuery('.modal').modal('hide');
        jQuery("#btn_hold_call, #btn_transfer_call").addClass("disabled");
    },

    dial_show_start_call: function() {
        jQuery("#btn_make_call").removeClass('hide');
        jQuery("#btn_cancel").addClass('hide');
    },

    make_answer_income_call: function(income_phone, uniqueid) {
        jQuery(".btn_answer_income_call").removeClass('hide');
        jQuery(".btn_income_call").addClass('hide');
        make_answer();
        // jQuery('.modal').modal('hide');
        this.view_detail(income_phone, uniqueid)
        
    },
    
    view_detail: function(income_phone, uniqueid){

        if(income_phone  == 'webcall'){
            return false;
        }

        webcallApi.doAjax({
            type: "POST",
            url:  '/voice_ajax/get_customer_info',
            data: {
                merchantId: merchant_id,
                phone: income_phone
            },
            beforeSend: function(){

            },
            success: function(res_cus_code){
                if(res_cus_code != null){
                    jQuery("#sidebar-home").css("display", "none");
                    jQuery("#sidebar-customer").css("display", "block");
                    jQuery("#home-content-body").css("display", "none");
                    jQuery("#customer-content-body").css("display", "block");

                    // webcallCustomer.openTab(res_cus_code, uniqueid);

                } else {
                    // webcallCustomer.new(income_phone);
                }
            }
        });
        
        
    },    

    make_transfer_call: function() {
        jQuery("#btn_transfer_call").addClass('hide');
        jQuery("#btn_cancel_transfer").removeClass('hide');
        var data = {
            action_type: 'tranfer_call',
            merchant_id: merchant_id,
            user_id: user_id
        };
        data[webcallApi.csrf_name] = webcallApi.csrf_hash;
        // this.process_by_ajax("/voice_ajax/transfer_agent", data, "tranfer_call_panel");
        jQuery.post( "/call/voice/transfer_agent", data, function(response){
            jQuery("#customer-information-panel").hide();
            jQuery("#tranfer_call_panel").html(response);
        });
    },

    go_back_answer_form: function() {
        jQuery("#btn_transfer_call").removeClass('hide');
        jQuery("#btn_cancel_transfer").addClass('hide');

        jQuery("#dtmf_panel").addClass('hide');
        jQuery("#btn_cancel_dtmf").addClass('hide');
        jQuery("#btn_dtmf").removeClass('hide');

        jQuery("#tranfer_call_panel").html('');
        jQuery("#customer-information-panel").show();
    },

    on_transfer: function(dest_ext){
        //console.log("transfer agent, destination: "+dest_ext);
        transfer(dest_ext);
        jQuery("#tranfer_call_panel").empty();
        jQuery("#btn_cancel_transfer").addClass('hide');
        jQuery("#customer-information-panel").show();
        jQuery("#btn_hold_call, #btn_transfer_call").addClass("disabled");
    },

    add_call_note: function(){
        jQuery(".last_note_panel").addClass('hide');
        jQuery(".add_call_note_panel").removeClass('hide');
    },

    cancel_call_note: function(){
        jQuery(".last_note_panel").removeClass('hide');
        jQuery(".add_call_note_panel").addClass('hide');
    },

    save_call_note: function(){
        var cus_code = jQuery('#cus_code').val();

        webcallApi.doAjax({
            url: '/api/customers/save_call',
            type: 'post',
            data: {
                data: jQuery('#call_note').val(),
                code: cus_code,
                ticket_code: jQuery("#ticket_code").val(),
                call_type: jQuery("#call_type").val()
            },
            dataType: 'json',
            success: function (result) {
                webcallLib.alertSuccess();
                jQuery('#call_note').html("");

                customerTimeline.append(cus_code, result.html);
                //obj.removeClass("disabled");
                //obj.find("i").addClass("fa-save").removeClass("fa-spinner fa-pulse");
                jQuery(".last_note_panel").removeClass('hide');
                jQuery(".add_call_note_panel").addClass('hide');
                
                if(result.data.date != null && result.data.data != null){
                    jQuery("#last_note_date").text(result.data.date);
                    jQuery("#last_note_data").text(result.data.data);

                    jQuery("#last_note_date").removeClass('hide');
                    jQuery("#last_note_data").removeClass('hide');
                }

            }
        });
    },

    on_dtmf: function(){
        jQuery("#dtmf_panel").removeClass('hide');
        jQuery("#btn_cancel_dtmf").removeClass('hide');
        jQuery("#btn_dtmf").addClass('hide');
        jQuery('#keypad input:text').val('');
    },

    add_new_customer: function (phone, fullname, cdr_unique) {
        webcallCustomer.new(phone, cdr_unique);
        webcallCustomer.cdr_uniqueid = cdr_unique;
        var id = '#customer-new';
        jQuery(id + " input[name=fullname]").val(fullname);
        jQuery(id + " input[name=phone_primary]").val(phone);
        jQuery(id + " .btn-customer-exist").removeClass("dpn");
        jQuery(id + " .btn-customer-import").addClass("dpn");
    },

    postbackParent: function (action) {
        if (merchant_id == 5762 || merchant_id == 5764){
            if (action === "cancel"){
                var message = '{"record_path":"","status":"CANCEL"}';
                parent.postMessage(message, '*');
                return;
            }

            var ticket_code = jQuery("input[name=notification_call_panel_tc]").val();
            webcallApi.doAjax({
                type: "POST",
                url: "/api/appay/get_record",
                data: {
                    ticket_code
                },
                dataType: "json",
                //async: false,
                success: function (res) {
                    if(res.status === true){
                        var data = res.data;
                        var message = '{"record_path":"' + data.record_path + '","status":"' + data.status + '","callee_num":"' + data.callee_num + '"}';
                        parent.postMessage(message, '*');
                    }
                }
            });
        }
    }
};


var sipIncomePopupLib = {

    show: function(income_phone, cdr_uniqueid, cus_id, cus_fullname){
        var index = income_call_arr.length;

        //existed customer
        if(cus_id != null && cus_id > 0){
            var text = "<div class='activity-item'> " +
                "<i class='fa fa-sign-in'></i> <div class='activity-title'>Incoming Call</div>" +
                "<div class='activity'> Contact: "+cus_fullname+" - <a href='javascript:;' onclick='voiceNotificationLib.view_detail(\""+income_phone+"\", \""+cdr_uniqueid+"\")'>"+income_phone+"</a> </div>" +
                "<div class='activity center'> <a href='javascript:;' class='btn btn-sm btn-default' onclick='sipIncomePopupLib.close("+index+")'>Close</a> <a href='javascript:;' class='btn btn-sm btn-warning' onclick='voiceNotificationLib.view_detail(\""+income_phone+"\", \""+cdr_uniqueid+"\")'>Open</a> </div>"
            " </div>";

        } else { //new customer
            var text = "<div class='activity-item'> " +
                "<i class='fa fa-sign-in'></i> <div class='activity-title'>Incoming Call</div>" +
                "<div class='activity'> Contact: New - <a href='javascript:;' onclick='webcallCustomer.new(\""+income_phone+"\")'>"+income_phone+"</a> </div>" +
                "<div class='activity center'> <a href='javascript:;' class='btn btn-sm btn-default' onclick='sipIncomePopupLib.close("+index+")'>Close</a> <a href='javascript:;' class='btn btn-sm btn-warning' onclick='webcallCustomer.new(\""+income_phone+"\")'>Open</a> </div>"
            " </div>";
        }


        var type = 'warning';

        var n = noty({
            text: text,
            type: type,
            dismissQueue: true,
            layout: 'bottomLeft',
            closeWith: ['button'],
            theme: 'relax',
            maxVisible: 10,
            animation: {
                open: 'animated bounceInLeft',
                close: 'animated bounceOutLeft',
                easing: 'swing',
                speed: 100
            },
        });
        income_call_arr.push(n);
    },

    close: function(index){
        var notify_box = income_call_arr[index];
        notify_box.close();
    }
}


function onchange2(evt) {

    var v = "visible", h = "hidden",
        evtMap = {
            focus: v, focusin: v, pageshow: v, blur: h, focusout: h, pagehide: h
        };
    if (evt.windowForcus == false) {
        flashTitle2(evt.title, 20);
    } else {
        evt = evt || window.event;
        if (evt.type in evtMap) {
            if (evtMap[evt.type] == 'hidden') {
                if (typeof evt.title != 'undefined') {
                    flashTitle2(evt.title, 20);
                }
            } else {
                cancelFlashTitle2();
            }
        } else {
            cancelFlashTitle2();
        }
    }
}

function flashTitle2(newMsg, howManyTimes) {
    function step() {
        document.title = (document.title == original) ? newMsg : original;

        if (--howManyTimes > 0) {
            timeout = setTimeout(step, 1000);
        }
        ;
    };

    howManyTimes = parseInt(howManyTimes);

    if (isNaN(howManyTimes)) {
        howManyTimes = 5;
    }
    ;

    cancelFlashTitle2();
    step();
}

function cancelFlashTitle2() {
    clearTimeout(timeout);
    document.title = original;
}