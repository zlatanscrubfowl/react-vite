<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\FobiUser;

class ResetPassword extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $token;
    private $frontendUrl;

    /**
     * Create a new message instance.
     *
     * @param FobiUser $user
     * @param string $token
     * @return void
     */
    public function __construct(FobiUser $user, $token)
    {
        $this->user = $user;
        $this->token = $token;
        $this->frontendUrl = 'https://talinara.com';
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        try {
            $resetUrl = $this->frontendUrl . '/reset-password?token=' . $this->token . '&email=' . urlencode($this->user->email);

            \Log::info('Building reset password email', [
                'user_id' => $this->user->id,
                'reset_url' => $resetUrl
            ]);

            return $this->view('emails.reset-password')
                       ->subject('Reset Password FOBI')
                       ->with([
                           'resetUrl' => $resetUrl,
                           'user' => $this->user
                       ]);
        } catch (\Exception $e) {
            \Log::error('Error building reset password email:', [
                'error' => $e->getMessage(),
                'user_id' => $this->user->id
            ]);
            throw $e;
        }
    }
}
