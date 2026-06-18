@extends('emails.layouts.main')

@section('content')
    <h1>Benvenuto</h1>
    <p>Il tuo account Backclub CRM è pronto.</p>
    
    <table class="data-table">
        <tr>
            <td class="data-label">Email</td>
            <td class="data-value">{{ $user->email }}</td>
        </tr>
        @if($password)
        <tr>
            <td class="data-label">Password</td>
            <td class="data-value">{{ $password }}</td>
        </tr>
        @endif
    </table>

    <div style="text-align: center; margin-top: 30px;">
        <a href="{{ config('app.url') }}/login" class="button">Accedi</a>
    </div>
@endsection
